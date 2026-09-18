import { prisma } from "@/lib/db";
import { recordHealthCheck } from "@/lib/checks";
import { fetchZapiInstanceStatus } from "./zapi";
import type { HealthStatus } from "@/generated/prisma/enums";

export interface ZapiSyncResult {
  checked: number;
  statusChanged: number;
  error?: string;
}

/**
 * Sincroniza a conexão dos números Z-API de uma empresa: consulta o status
 * de cada instância com o Client-Token da conta + o token de cada número, e
 * só grava HealthCheck (via lib/checks.ts, dona da regra) quando o status
 * de conexão muda de fato. Vencimento e pagamento não têm endpoint nessa
 * conta — não são tocados aqui, ficam manuais. Usada pelo worker (cron) e
 * pelo botão "Sincronizar agora" na UI — mesma função, sem duplicar lógica.
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
      const instanceStatus = await fetchZapiInstanceStatus(
        number.externalId!,
        number.providerToken!,
        config.clientToken,
      );
      checked += 1;

      const status: HealthStatus = instanceStatus.connected ? "GREEN" : "RED";
      if (status === number.currentStatus) continue;

      statusChanged += 1;
      await recordHealthCheck({
        orgId,
        phoneNumberId: number.id,
        source: "API",
        status,
        observation:
          status === "RED"
            ? instanceStatus.error ?? "Instância desconectada no Z-API"
            : undefined,
      });
    } catch (err) {
      errors.push(`${number.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    checked,
    statusChanged,
    error: errors.length ? errors.join(" · ") : undefined,
  };
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
