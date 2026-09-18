import { prisma } from "@/lib/db";
import { recordHealthCheck } from "@/lib/checks";
import { fetchZapiPartnerInstances } from "./zapi";
import type { HealthStatus } from "@/generated/prisma/enums";

export interface ZapiSyncResult {
  checked: number;
  updated: number;
  statusChanged: number;
  error?: string;
}

/**
 * Sincroniza os números Z-API de uma empresa: busca a listagem de parceiro,
 * casa por externalId, atualiza o cache de vencimento/pagamento sempre, e
 * só grava HealthCheck (via lib/checks.ts, dona da regra) quando o status
 * de conexão muda de fato. Usada pelo worker (cron) e pelo botão "Sincronizar
 * agora" na UI — mesma função, sem duplicar lógica.
 */
export async function syncZapiForOrg(orgId: string): Promise<ZapiSyncResult> {
  const credential = await prisma.providerCredential.findUnique({
    where: { orgId_provider: { orgId, provider: "ZAPI" } },
  });
  const config = credential?.config as { partnerToken?: string } | undefined;
  if (!config?.partnerToken) {
    return { checked: 0, updated: 0, statusChanged: 0, error: "Nenhum Partner-Token configurado." };
  }

  let instances;
  try {
    instances = await fetchZapiPartnerInstances(config.partnerToken);
  } catch (err) {
    return {
      checked: 0,
      updated: 0,
      statusChanged: 0,
      error: err instanceof Error ? err.message : "Falha ao consultar a API do Z-API.",
    };
  }
  const instanceById = new Map(instances.map((i) => [i.id, i]));

  const numbers = await prisma.phoneNumber.findMany({
    where: { orgId, provider: "ZAPI", active: true, externalId: { not: null } },
  });

  let updated = 0;
  let statusChanged = 0;

  for (const number of numbers) {
    const instance = instanceById.get(number.externalId!);
    if (!instance) continue;
    updated += 1;

    await prisma.phoneNumber.update({
      where: { id: number.id },
      data: {
        providerDueAt: instance.due ? new Date(instance.due) : null,
        providerPaymentStatus: instance.paymentStatus,
      },
    });

    const status: HealthStatus = instance.phoneConnected && instance.whatsappConnected ? "GREEN" : "RED";
    if (status === number.currentStatus) continue;

    statusChanged += 1;
    await recordHealthCheck({
      orgId,
      phoneNumberId: number.id,
      source: "API",
      status,
      observation: status === "RED" ? "Instância desconectada no Z-API" : undefined,
    });
  }

  return { checked: numbers.length, updated, statusChanged };
}

/** Roda syncZapiForOrg pra toda empresa com credencial Z-API configurada. */
export async function syncAllZapiCredentials(): Promise<void> {
  const credentials = await prisma.providerCredential.findMany({ where: { provider: "ZAPI" } });

  for (const credential of credentials) {
    try {
      const result = await syncZapiForOrg(credential.orgId);
      if (result.error) {
        console.error(`[zapi-sync] org ${credential.orgId}: ${result.error}`);
      } else {
        console.log(
          `[zapi-sync] org ${credential.orgId}: ${result.updated}/${result.checked} atualizados, ${result.statusChanged} mudaram de status`,
        );
      }
    } catch (err) {
      console.error(`[zapi-sync] erro inesperado na org ${credential.orgId}`, err);
    }
  }
}
