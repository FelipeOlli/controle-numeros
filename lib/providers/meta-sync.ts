import { prisma } from "@/lib/db";
import { recordHealthCheck } from "@/lib/checks";
import {
  fetchMetaPhoneNumbers,
  fetchMetaSpend,
  fetchMetaSubscribedAppsCount,
  type MetaHealthIssue,
  type MetaPhoneNumberStatus,
} from "./meta";
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
  /** Problemas encontrados + o que fazer — vazio quando está tudo bem. */
  problems?: string[];
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

function mapQualityRating(rating: string | undefined): MetaQualityRating {
  if (rating === "GREEN" || rating === "YELLOW" || rating === "RED") return rating;
  return "UNKNOWN";
}

const SEVERITY: Record<HealthStatus, number> = {
  UNKNOWN: 0,
  GREEN: 1,
  YELLOW: 2,
  RED: 3,
  LOST: 4,
  BANNED: 5,
};

const META_STATUS_PROBLEMS: Record<string, string> = {
  FLAGGED:
    "Número sinalizado pela Meta por queda de qualidade. Reduza o volume de disparos e revise os templates — se a qualidade não melhorar em 7 dias, o limite de envio cai.",
  RESTRICTED:
    "Número restrito: atingiu o limite de conversas iniciadas pela empresa. Aguarde a janela de 24h ou solicite aumento de tier no Gerenciador do WhatsApp.",
  PENDING:
    "Registro do número pendente na Cloud API. Conclua o registro (verificação por código + PIN) no Gerenciador do WhatsApp.",
  BANNED:
    "Número banido pela Meta. Abra uma solicitação de revisão no Gerenciador do WhatsApp (Business Support).",
  DISCONNECTED:
    "Número desconectado da Cloud API — não envia nem recebe. Registre o número novamente no Gerenciador do WhatsApp.",
  MIGRATED: "Número migrado para outra conta WhatsApp (WABA). Confira no Gerenciador do WhatsApp e atualize o ID no cadastro.",
  DELETED: "Número excluído da conta WhatsApp (WABA). Confira no Gerenciador do WhatsApp.",
};

const ENTITY_LABELS: Record<string, string> = {
  PHONE_NUMBER: "Número",
  WABA: "Conta WhatsApp (WABA)",
  BUSINESS: "Empresa (Business Manager)",
  APP: "App da Meta",
};

function describeIssue(issue: MetaHealthIssue): string {
  const where = ENTITY_LABELS[issue.entityType] ?? issue.entityType;
  const what =
    issue.description ??
    (issue.canSendMessage === "BLOCKED" ? "envio de mensagens bloqueado" : "envio de mensagens limitado");
  const code = issue.errorCode ? ` (erro ${issue.errorCode})` : "";
  const fix = issue.possibleSolution ? ` Como resolver: ${issue.possibleSolution}` : "";
  return `${where}: ${what}${code}.${fix}`;
}

interface MetaDiagnosis {
  status: HealthStatus;
  problems: string[];
}

/**
 * Diz se o número consegue de fato enviar e receber — não basta estar
 * CONNECTED. Junta os sinais da Graph API e fica o mais grave:
 * - status do número (CONNECTED, FLAGGED, BANNED…);
 * - health_status: se pode enviar e, se não, os erros de cada camada
 *   (número, WABA, empresa, app) com a correção sugerida pela Meta;
 * - quality_rating (média/baixa → risco de restrição);
 * - webhooks da WABA: sem app inscrito, as mensagens recebidas não chegam.
 * "status" nem sempre vem no edge — sem nenhum sinal de conexão, a
 * qualidade decide sozinha.
 */
function diagnoseMetaNumber(
  remote: MetaPhoneNumberStatus,
  subscribedApps: number | null,
): MetaDiagnosis {
  const problems: string[] = [];
  const signals: HealthStatus[] = [];

  const fromStatus = mapMetaStatus(remote.status);
  signals.push(fromStatus);
  if (remote.status && META_STATUS_PROBLEMS[remote.status]) {
    problems.push(META_STATUS_PROBLEMS[remote.status]);
  }

  const fromSend = mapCanSendMessage(remote.canSendMessage);
  signals.push(fromSend);
  if (remote.issues.length > 0) {
    problems.push(...remote.issues.map(describeIssue));
  } else if (fromSend === "RED") {
    problems.push("Meta bloqueou o envio de mensagens deste número. Verifique avisos no Gerenciador do WhatsApp.");
  } else if (fromSend === "YELLOW") {
    problems.push("Meta limitou o envio de mensagens deste número. Verifique avisos no Gerenciador do WhatsApp.");
  }

  const quality = mapQualityRating(remote.qualityRating);
  if (quality !== "UNKNOWN") signals.push(quality);
  if (quality === "YELLOW") {
    problems.push(
      "Qualidade média: clientes estão bloqueando ou denunciando as mensagens. Revise frequência, conteúdo dos templates e opt-in.",
    );
  } else if (quality === "RED") {
    problems.push(
      "Qualidade baixa: risco de restrição e queda do limite de envio. Pause campanhas e revise templates e opt-in.",
    );
  }

  if (subscribedApps === 0) {
    signals.push("RED");
    problems.push(
      "Nenhum app inscrito nos webhooks da conta WhatsApp (WABA): as mensagens recebidas não chegam ao seu sistema. Inscreva o app (POST /{waba-id}/subscribed_apps) ou reconecte a integração.",
    );
  }

  // Banido/perdido é definitivo: nenhum outro sinal muda isso.
  if (fromStatus === "BANNED" || fromStatus === "LOST") return { status: fromStatus, problems };

  const status = signals.reduce<HealthStatus>(
    (worst, signal) => (SEVERITY[signal] > SEVERITY[worst] ? signal : worst),
    "UNKNOWN",
  );
  return { status, problems };
}

/** Texto do estado na Meta pro botão — nunca "undefined". */
function describeRemote(remote: MetaPhoneNumberStatus): string | undefined {
  return remote.status ?? (remote.canSendMessage ? `Envio: ${remote.canSendMessage}` : undefined);
}

type SyncableMetaNumber = {
  id: string;
  currentStatus: HealthStatus;
};

/**
 * Aplica o diagnóstico a um número: atualiza qualidade/tier sempre e grava
 * HealthCheck (via lib/checks.ts) quando o status muda — ou quando, fora do
 * verde, o motivo mudou, pra observação sempre dizer o problema atual.
 */
async function applyMetaDiagnosis(
  orgId: string,
  number: SyncableMetaNumber,
  remote: MetaPhoneNumberStatus,
  diagnosis: MetaDiagnosis,
): Promise<boolean> {
  await prisma.phoneNumber.update({
    where: { id: number.id },
    data: {
      qualityRating: mapQualityRating(remote.qualityRating),
      tier: remote.messagingTier,
      lastSyncAt: new Date(),
    },
  });

  const observation = diagnosis.problems.length ? diagnosis.problems.join("\n") : undefined;

  let shouldRecord = diagnosis.status !== number.currentStatus;
  if (!shouldRecord && diagnosis.status !== "GREEN") {
    const lastCheck = await prisma.healthCheck.findFirst({
      where: { phoneNumberId: number.id },
      orderBy: { createdAt: "desc" },
      select: { observation: true },
    });
    shouldRecord = (lastCheck?.observation ?? undefined) !== observation;
  }
  if (!shouldRecord) return false;

  await recordHealthCheck({
    orgId,
    phoneNumberId: number.id,
    source: "API",
    status: diagnosis.status,
    observation,
  });
  return diagnosis.status !== number.currentStatus;
}

/** Webhooks da WABA — falha aqui não derruba o sync (null = não verificado). */
async function safeSubscribedAppsCount(config: Required<Pick<MetaCredentialConfig, "wabaId" | "accessToken">>) {
  try {
    return await fetchMetaSubscribedAppsCount(config.wabaId, config.accessToken);
  } catch (err) {
    console.error("[meta-sync] falha ao consultar webhooks da WABA", err);
    return null;
  }
}

/**
 * Sincroniza status/qualidade/tier dos números Meta Cloud API de uma
 * empresa, numa chamada só (GET /{wabaId}/phone_numbers) + uma pros
 * webhooks da WABA (vale pra todos os números dela).
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
  const subscribedApps = await safeSubscribedAppsCount({
    wabaId: config.wabaId,
    accessToken: config.accessToken,
  });

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
      const diagnosis = diagnoseMetaNumber(remote, subscribedApps);
      checked += 1;
      if (await applyMetaDiagnosis(orgId, number, remote, diagnosis)) statusChanged += 1;
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

  const subscribedApps = await safeSubscribedAppsCount({
    wabaId: config.wabaId,
    accessToken: config.accessToken,
  });
  const diagnosis = diagnoseMetaNumber(remote, subscribedApps);
  const statusChanged = await applyMetaDiagnosis(orgId, number, remote, diagnosis);

  await prisma.providerCredential.update({
    where: { orgId_platform: { orgId, platform: "META_CLOUD" } },
    data: { lastSyncAt: new Date() },
  });

  return {
    ok: true,
    statusChanged,
    status: describeRemote(remote),
    health: diagnosis.status,
    qualityRating: mapQualityRating(remote.qualityRating),
    problems: diagnosis.problems,
  };
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
