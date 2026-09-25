import { prisma } from "@/lib/db";
import { recordHealthCheck } from "@/lib/checks";
import { fetchZapiInstanceStatus, type ZapiInstanceStatus } from "./zapi";
import type { HealthStatus } from "@/generated/prisma/enums";

export interface ZapiSyncResult {
  checked: number;
  statusChanged: number;
  error?: string;
}

export interface ZapiNumberSyncResult {
  ok: boolean;
  statusChanged: boolean;
  error?: string;
  /** Estado que a Z-API devolveu agora — pra UI mostrar mesmo sem mudança. */
  connected?: boolean;
  smartphoneConnected?: boolean;
}

type SyncableNumber = {
  id: string;
  label: string;
  externalId: string | null;
  providerToken: string | null;
  currentStatus: HealthStatus;
};

/**
 * Consulta o status de conexão de UM número no Z-API e só grava HealthCheck
 * (via lib/checks.ts, dona da regra) quando o status muda de fato. Sempre
 * atualiza lastSyncAt — diferente de lastCheckAt, que só muda com a mudança
 * de status. Núcleo compartilhado por syncZapiForOrg (todos os números da
 * empresa) e syncZapiForNumber (um número só, botão no detalhe).
 */
async function syncOneNumber(
  orgId: string,
  number: SyncableNumber,
  clientToken: string,
): Promise<{ statusChanged: boolean; instanceStatus: ZapiInstanceStatus }> {
  const instanceStatus = await fetchZapiInstanceStatus(
    number.externalId!,
    number.providerToken!,
    clientToken,
  );

  await prisma.phoneNumber.update({
    where: { id: number.id },
    data: { lastSyncAt: new Date() },
  });

  const status: HealthStatus = instanceStatus.connected ? "GREEN" : "RED";
  if (status === number.currentStatus) return { statusChanged: false, instanceStatus };

  await recordHealthCheck({
    orgId,
    phoneNumberId: number.id,
    source: "API",
    status,
    observation:
      status === "RED" ? instanceStatus.error ?? "Instância desconectada no Z-API" : undefined,
  });

  return { statusChanged: true, instanceStatus };
}

/**
 * Sincroniza a conexão dos números Z-API de uma empresa. Vencimento e
 * pagamento não têm endpoint nessa conta — não são tocados aqui, ficam
 * manuais. Usada pelo worker (cron) e pelo botão "Sincronizar agora" da
 * empresa na UI.
 */
export async function syncZapiForOrg(orgId: string): Promise<ZapiSyncResult> {
  const credential = await prisma.providerCredential.findUnique({
    where: { orgId_platform: { orgId, platform: "ZAPI" } },
  });
  const config = credential?.config as { clientToken?: string } | undefined;
  if (!config?.clientToken) {
    return { checked: 0, statusChanged: 0, error: "Nenhum Client-Token configurado." };
  }

  const numbers = await prisma.phoneNumber.findMany({
    where: {
      orgId,
      platforms: { has: "ZAPI" },
      active: true,
      externalId: { not: null },
      providerToken: { not: null },
    },
  });

  let checked = 0;
  let statusChanged = 0;
  const errors: string[] = [];

  for (const number of numbers) {
    try {
      const result = await syncOneNumber(orgId, number, config.clientToken);
      checked += 1;
      if (result.statusChanged) statusChanged += 1;
    } catch (err) {
      errors.push(`${number.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // A tentativa de sync da empresa aconteceu, mesmo que 0 números tenham
  // sido verificados ou todos tenham dado erro — reflete "quando rodou",
  // não "quando deu certo".
  await prisma.providerCredential.update({
    where: { orgId_platform: { orgId, platform: "ZAPI" } },
    data: { lastSyncAt: new Date() },
  });

  return {
    checked,
    statusChanged,
    error: errors.length ? errors.join(" · ") : undefined,
  };
}

/**
 * Sincroniza um único número Z-API — mesma lógica de syncZapiForOrg, usada
 * pelo botão "Sincronizar" no detalhe do número (sem esperar pelos outros
 * números da empresa).
 */
export async function syncZapiForNumber(
  orgId: string,
  numberId: string,
): Promise<ZapiNumberSyncResult> {
  const [credential, number] = await Promise.all([
    prisma.providerCredential.findUnique({
      where: { orgId_platform: { orgId, platform: "ZAPI" } },
    }),
    prisma.phoneNumber.findUnique({ where: { id: numberId } }),
  ]);

  const config = credential?.config as { clientToken?: string } | undefined;
  if (!config?.clientToken) {
    return { ok: false, statusChanged: false, error: "Nenhum Client-Token configurado pra essa empresa." };
  }
  if (!number || number.orgId !== orgId) {
    return { ok: false, statusChanged: false, error: "Número não encontrado." };
  }
  if (!number.externalId || !number.providerToken) {
    return { ok: false, statusChanged: false, error: "Número sem ID/Token do Z-API configurado." };
  }

  try {
    const { statusChanged, instanceStatus } = await syncOneNumber(
      orgId,
      number,
      config.clientToken,
    );
    await prisma.providerCredential.update({
      where: { orgId_platform: { orgId, platform: "ZAPI" } },
      data: { lastSyncAt: new Date() },
    });
    return {
      ok: true,
      statusChanged,
      connected: instanceStatus.connected,
      smartphoneConnected: instanceStatus.smartphoneConnected,
    };
  } catch (err) {
    return { ok: false, statusChanged: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Roda syncZapiForOrg pra toda empresa com credencial Z-API configurada. */
export async function syncAllZapiCredentials(): Promise<void> {
  const credentials = await prisma.providerCredential.findMany({ where: { platform: "ZAPI" } });

  for (const credential of credentials) {
    try {
      const result = await syncZapiForOrg(credential.orgId);
      if (result.error) {
        console.error(`[zapi-sync] org ${credential.orgId}: ${result.error}`);
      } else {
        console.log(
          `[zapi-sync] org ${credential.orgId}: ${result.checked} verificados, ${result.statusChanged} mudaram de status`,
        );
      }
    } catch (err) {
      console.error(`[zapi-sync] erro inesperado na org ${credential.orgId}`, err);
    }
  }
}
