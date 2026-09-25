import { prisma } from "@/lib/db";
import { recordHealthCheck } from "@/lib/checks";
import { fetchMetaPhoneNumbers, fetchMetaSpend, type MetaPhoneNumberStatus } from "./meta";
import type { HealthStatus, MetaQualityRating } from "@/generated/prisma/enums";

export interface MetaSyncResult {
  checked: number;
  statusChanged: number;
  error?: string;
}

export interface MetaNumberSyncResult {
  ok: boolean;
  statusChanged: boolean;
  error?: string;
  status?: string;
  /** Status de saúde derivado (o que vai pro badge do número). */
  health?: HealthStatus;
  qualityRating?: MetaQualityRating;
}

interface MetaCredentialConfig {
  wabaId?: string;
  accessToken?: string;
  /** Moeda da conta — a Graph API não devolve isso junto do custo. */
  currency?: string;
}

function readMetaConfig(config: unknown): MetaCredentialConfig | undefined {
  return config as MetaCredentialConfig | undefined;
}

/** CONNECTED é o único status "saudável" — o resto vira alerta em graus. */
function mapMetaStatus(status: string | undefined): HealthStatus {
  switch (status) {
    case "CONNECTED":
      return "GREEN";
    case "FLAGGED":
    case "RESTRICTED":
    case "PENDING":
      return "YELLOW";
    case "BANNED":
      return "BANNED";
    case "DISCONNECTED":
    case "MIGRATED":
    case "DELETED":
      return "LOST";
    default:
      return "UNKNOWN";
  }
}

function mapCanSendMessage(value: string | undefined): HealthStatus {
  switch (value) {
    case "AVAILABLE":
      return "GREEN";
    case "LIMITED":
      return "YELLOW";
    case "BLOCKED":
      return "RED";
    default:
      return "UNKNOWN";
  }
}

const SEVERITY: Record<HealthStatus, number> = {
  UNKNOWN: 0,
  GREEN: 1,
  YELLOW: 2,
  RED: 3,
  LOST: 4,
  BANNED: 5,
};

/**
 * Status de saúde a partir do que a Graph API devolveu. "status" nem sempre
 * vem no edge /phone_numbers — sem ele, cai pra health_status e, por fim,
 * pra quality_rating. Com o número conectado, qualidade média/baixa piora o
 * status (fica o mais grave dos sinais).
 */
function deriveMetaHealth(remote: MetaPhoneNumberStatus): HealthStatus {
  const quality = mapQualityRating(remote.qualityRating);
  const qualityStatus: HealthStatus = quality === "UNKNOWN" ? "UNKNOWN" : quality;

  let status = mapMetaStatus(remote.status);
  if (status === "UNKNOWN") status = mapCanSendMessage(remote.canSendMessage);
  if (status === "UNKNOWN") return qualityStatus;

  if (status === "GREEN" || status === "YELLOW") {
    for (const signal of [mapCanSendMessage(remote.canSendMessage), qualityStatus]) {
      if (SEVERITY[signal] > SEVERITY[status]) status = signal;
    }
  }
  return status;
}

/** Texto do estado na Meta pro histórico/botão — nunca "undefined". */
function describeRemote(remote: MetaPhoneNumberStatus): string | undefined {
  return remote.status ?? (remote.canSendMessage ? `Envio: ${remote.canSendMessage}` : undefined);
}

function mapQualityRating(rating: string | undefined): MetaQualityRating {
  if (rating === "GREEN" || rating === "YELLOW" || rating === "RED") return rating;
  return "UNKNOWN";
}

/**
 * Sincroniza status/qualidade/tier dos números Meta Cloud API de uma
 * empresa, numa chamada só (GET /{wabaId}/phone_numbers). Só grava
 * HealthCheck (via lib/checks.ts) quando o status muda — qualityRating e
 * tier são atributos, atualizados sempre, sem virar entrada no histórico.
 */
export async function syncMetaForOrg(orgId: string): Promise<MetaSyncResult> {
  const credential = await prisma.providerCredential.findUnique({
    where: { orgId_platform: { orgId, platform: "META_CLOUD" } },
  });
  const config = readMetaConfig(credential?.config);
  if (!config?.wabaId || !config?.accessToken) {
    return { checked: 0, statusChanged: 0, error: "Credencial Meta Cloud API incompleta." };
  }

  const numbers = await prisma.phoneNumber.findMany({
    where: {
      orgId,
      platforms: { has: "META_CLOUD" },
      active: true,
      externalId: { not: null },
    },
  });
  if (numbers.length === 0) {
    return { checked: 0, statusChanged: 0 };
  }

  let remoteNumbers;
  try {
    remoteNumbers = await fetchMetaPhoneNumbers(config.wabaId, config.accessToken);
  } catch (err) {
    return {
      checked: 0,
      statusChanged: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  const remoteById = new Map(remoteNumbers.map((n) => [n.phoneNumberId, n]));

  let checked = 0;
  let statusChanged = 0;
  const errors: string[] = [];

  for (const number of numbers) {
    const remote = remoteById.get(number.externalId!);
    if (!remote) {
      errors.push(`${number.label}: não encontrado na WABA`);
      continue;
    }

    try {
      const status = deriveMetaHealth(remote);
      const qualityRating = mapQualityRating(remote.qualityRating);

      await prisma.phoneNumber.update({
        where: { id: number.id },
        data: { qualityRating, tier: remote.messagingTier, lastSyncAt: new Date() },
      });

      checked += 1;
      if (status !== number.currentStatus) {
        await recordHealthCheck({
          orgId,
          phoneNumberId: number.id,
          source: "API",
          status,
          observation: status !== "GREEN" && describeRemote(remote) ? `Status na Meta: ${describeRemote(remote)}` : undefined,
        });
        statusChanged += 1;
      }
    } catch (err) {
      errors.push(`${number.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await prisma.providerCredential.update({
    where: { orgId_platform: { orgId, platform: "META_CLOUD" } },
    data: { lastSyncAt: new Date() },
  });

  return { checked, statusChanged, error: errors.length ? errors.join(" · ") : undefined };
}

/**
 * Sincroniza só um número Meta Cloud API — mesma lógica de syncMetaForOrg
 * (a Graph API não tem endpoint por número mais barato que o da WABA
 * inteira), usada pelo botão "Sincronizar" no detalhe do número.
 */
export async function syncMetaForNumber(
  orgId: string,
  numberId: string,
): Promise<MetaNumberSyncResult> {
  const [credential, number] = await Promise.all([
    prisma.providerCredential.findUnique({
      where: { orgId_platform: { orgId, platform: "META_CLOUD" } },
    }),
    prisma.phoneNumber.findUnique({ where: { id: numberId } }),
  ]);

  const config = readMetaConfig(credential?.config);
  if (!config?.wabaId || !config?.accessToken) {
    return { ok: false, statusChanged: false, error: "Credencial Meta Cloud API incompleta." };
  }
  if (!number || number.orgId !== orgId) {
    return { ok: false, statusChanged: false, error: "Número não encontrado." };
  }
  if (!number.externalId) {
    return { ok: false, statusChanged: false, error: "Número sem ID do Meta configurado." };
  }

  let remoteNumbers;
  try {
    remoteNumbers = await fetchMetaPhoneNumbers(config.wabaId, config.accessToken);
  } catch (err) {
    return {
      ok: false,
      statusChanged: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const remote = remoteNumbers.find((n) => n.phoneNumberId === number.externalId);
  if (!remote) {
    return { ok: false, statusChanged: false, error: "Número não encontrado na WABA." };
  }

  const status = deriveMetaHealth(remote);
  const qualityRating = mapQualityRating(remote.qualityRating);

  await prisma.phoneNumber.update({
    where: { id: number.id },
    data: { qualityRating, tier: remote.messagingTier, lastSyncAt: new Date() },
  });

  let statusChanged = false;
  if (status !== number.currentStatus) {
    await recordHealthCheck({
      orgId,
      phoneNumberId: number.id,
      source: "API",
      status,
      observation: status !== "GREEN" && describeRemote(remote) ? `Status na Meta: ${describeRemote(remote)}` : undefined,
    });
    statusChanged = true;
  }

  await prisma.providerCredential.update({
    where: { orgId_platform: { orgId, platform: "META_CLOUD" } },
    data: { lastSyncAt: new Date() },
  });

  return { ok: true, statusChanged, status: describeRemote(remote), health: status, qualityRating };
}

/**
 * Gasto do mês corrente por número Meta Cloud API de uma empresa — separado
 * de syncMetaForOrg porque roda em cadência diferente (worker: diário, não a
 * cada 10 min) e usa um endpoint de analytics distinto do de status.
 */
export async function syncMetaSpendForOrg(orgId: string): Promise<{ error?: string }> {
  const credential = await prisma.providerCredential.findUnique({
    where: { orgId_platform: { orgId, platform: "META_CLOUD" } },
  });
  const config = readMetaConfig(credential?.config);
  if (!config?.wabaId || !config?.accessToken) {
    return { error: "Credencial Meta Cloud API incompleta." };
  }

  const numbers = await prisma.phoneNumber.findMany({
    where: {
      orgId,
      platforms: { has: "META_CLOUD" },
      active: true,
      externalId: { not: null },
    },
  });
  if (numbers.length === 0) return {};

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const spendMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let spend;
  try {
    spend = await fetchMetaSpend(config.wabaId, config.accessToken, start, now);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  const spendById = new Map(spend.map((s) => [s.phoneNumberId, s]));

  for (const number of numbers) {
    const entry = spendById.get(number.externalId!);
    await prisma.phoneNumber.update({
      where: { id: number.id },
      data: {
        monthlySpend: entry?.cost ?? null,
        spendCurrency: entry ? (entry.currency ?? config.currency ?? null) : null,
        spendMonth: entry ? spendMonth : null,
      },
    });
  }

  return {};
}

/** Roda syncMetaForOrg pra toda empresa com credencial Meta Cloud API configurada. */
export async function syncAllMetaCredentials(): Promise<void> {
  const credentials = await prisma.providerCredential.findMany({
    where: { platform: "META_CLOUD" },
  });

  for (const credential of credentials) {
    try {
      const result = await syncMetaForOrg(credential.orgId);
      if (result.error) {
        console.error(`[meta-sync] org ${credential.orgId}: ${result.error}`);
      } else {
        console.log(
          `[meta-sync] org ${credential.orgId}: ${result.checked} verificados, ${result.statusChanged} mudaram de status`,
        );
      }
    } catch (err) {
      console.error(`[meta-sync] erro inesperado na org ${credential.orgId}`, err);
    }
  }
}

/** Roda syncMetaSpendForOrg pra toda empresa com credencial Meta Cloud API configurada. */
export async function syncAllMetaSpend(): Promise<void> {
  const credentials = await prisma.providerCredential.findMany({
    where: { platform: "META_CLOUD" },
  });

  for (const credential of credentials) {
    try {
      const result = await syncMetaSpendForOrg(credential.orgId);
      if (result.error) {
        console.error(`[meta-spend] org ${credential.orgId}: ${result.error}`);
      }
    } catch (err) {
      console.error(`[meta-spend] erro inesperado na org ${credential.orgId}`, err);
    }
  }
}
