import { prisma } from "@/lib/db";
import { recordHealthCheck } from "@/lib/checks";
import { fetchMetaPhoneNumbers, fetchMetaSpend } from "./meta";
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
function mapMetaStatus(status: string): HealthStatus {
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
      const status = mapMetaStatus(remote.status);
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
          observation: status !== "GREEN" && remote.status ? `Status na Meta: ${remote.status}` : undefined,
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

  const status = mapMetaStatus(remote.status);
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
      observation: status !== "GREEN" && remote.status ? `Status na Meta: ${remote.status}` : undefined,
    });
    statusChanged = true;
  }

  await prisma.providerCredential.update({
    where: { orgId_platform: { orgId, platform: "META_CLOUD" } },
    data: { lastSyncAt: new Date() },
  });

  return { ok: true, statusChanged, status: remote.status, qualityRating };
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
