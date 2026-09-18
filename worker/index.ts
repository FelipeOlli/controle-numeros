import "dotenv/config";
import cron from "node-cron";
import { PrismaClient } from "../generated/prisma/client";
import type { HealthStatus } from "../generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { isStale, scoreForStatus } from "../lib/health";
import { dispatchStatusChange } from "../lib/alerts/dispatch";
import { fetchZapiPartnerInstances } from "../lib/providers/zapi";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Mesma ordem de gravidade de lib/checks.ts — só decide se um disparo vale alerta. */
const STATUS_RANK: Record<HealthStatus, number> = {
  GREEN: 3,
  YELLOW: 2,
  RED: 1,
  UNKNOWN: 1,
  BANNED: 0,
  LOST: 0,
};

/**
 * Marca como UNKNOWN quem não recebe check há mais de 72h e abre incidente.
 * É aqui que os coletores automáticos (fase 2) vão encaixar: rodam antes
 * desta função e gravam HealthCheck com source "API", então a maioria dos
 * números nunca chega a ficar "stale".
 */
async function markStaleNumbers() {
  const candidates = await prisma.phoneNumber.findMany({
    where: { active: true, currentStatus: { not: "UNKNOWN" } },
  });

  const stale = candidates.filter((n) => isStale(n.lastCheckAt));

  for (const number of stale) {
    const status = "UNKNOWN" as const;
    const score = 0;

    await prisma.$transaction([
      prisma.phoneNumber.update({
        where: { id: number.id },
        data: { currentStatus: status, currentScore: score },
      }),
      prisma.incident.create({
        data: { phoneNumberId: number.id, fromStatus: number.currentStatus, toStatus: status },
      }),
    ]);

    await dispatchStatusChange({
      orgId: number.orgId,
      phoneNumberId: number.id,
      phoneLabel: number.label,
      fromStatus: number.currentStatus,
      toStatus: status,
    });

    console.log(`[worker] ${number.label} marcado como UNKNOWN (sem check há >72h)`);
  }
}

/**
 * Coletor Z-API (fase 2): pra cada empresa com credencial de parceiro
 * configurada, busca a listagem de instâncias (conexão + pagamento +
 * vencimento numa chamada só) e casa por externalId. Atualiza o cache de
 * vencimento sempre; só grava HealthCheck/incidente quando o status de
 * conexão realmente muda.
 */
async function syncZapiInstances() {
  const credentials = await prisma.providerCredential.findMany({ where: { provider: "ZAPI" } });

  for (const credential of credentials) {
    const config = credential.config as { partnerToken?: string };
    if (!config.partnerToken) continue;

    try {
      const instances = await fetchZapiPartnerInstances(config.partnerToken);
      const instanceById = new Map(instances.map((i) => [i.id, i]));

      const numbers = await prisma.phoneNumber.findMany({
        where: {
          orgId: credential.orgId,
          provider: "ZAPI",
          active: true,
          externalId: { not: null },
        },
      });

      for (const number of numbers) {
        const instance = instanceById.get(number.externalId!);
        if (!instance) continue;

        await prisma.phoneNumber.update({
          where: { id: number.id },
          data: {
            providerDueAt: instance.due ? new Date(instance.due) : null,
            providerPaymentStatus: instance.paymentStatus,
          },
        });

        const status: HealthStatus =
          instance.phoneConnected && instance.whatsappConnected ? "GREEN" : "RED";
        if (status === number.currentStatus) continue;

        const score = scoreForStatus(status);
        const previousStatus = number.currentStatus;

        await prisma.$transaction([
          prisma.healthCheck.create({
            data: {
              phoneNumberId: number.id,
              status,
              score,
              source: "API",
              observation: status === "RED" ? "Instância desconectada no Z-API" : undefined,
            },
          }),
          prisma.phoneNumber.update({
            where: { id: number.id },
            data: { currentStatus: status, currentScore: score, lastCheckAt: new Date() },
          }),
          prisma.incident.create({
            data: { phoneNumberId: number.id, fromStatus: previousStatus, toStatus: status },
          }),
        ]);

        if (STATUS_RANK[status] < STATUS_RANK[previousStatus]) {
          await dispatchStatusChange({
            orgId: credential.orgId,
            phoneNumberId: number.id,
            phoneLabel: number.label,
            fromStatus: previousStatus,
            toStatus: status,
          });
        }

        console.log(`[worker] ${number.label} (Z-API) ${previousStatus} → ${status}`);
      }
    } catch (err) {
      console.error(`[worker] erro ao sincronizar Z-API da org ${credential.orgId}`, err);
    }
  }
}

/** Resumo diário por org: quantos números em cada status. */
async function sendDailyDigest() {
  const hasChannel = (await prisma.alertChannel.count({ where: { enabled: true } })) > 0;
  if (!hasChannel) return; // Notificações é global agora — sem canal ativo, não há pra quem mandar.

  const orgs = await prisma.organization.findMany({ include: { phoneNumbers: true } });

  for (const org of orgs) {
    if (org.phoneNumbers.length === 0) continue;

    const counts: Record<string, number> = {};
    for (const n of org.phoneNumbers) {
      counts[n.currentStatus] = (counts[n.currentStatus] ?? 0) + 1;
    }

    console.log(`[worker] digest ${org.name}:`, counts);
    // O envio efetivo do digest usa os mesmos canais globais de AlertChannel;
    // fica como próximo passo natural ao lado dos coletores automáticos.
  }
}

console.log("[worker] iniciado");

// A cada hora, verifica números sem check recente.
cron.schedule("0 * * * *", () => {
  markStaleNumbers().catch((err) => console.error("[worker] erro no markStaleNumbers", err));
});

// A cada 30 minutos, sincroniza conexão/pagamento/vencimento das instâncias Z-API.
cron.schedule("*/30 * * * *", () => {
  syncZapiInstances().catch((err) => console.error("[worker] erro no syncZapiInstances", err));
});

// Todo dia às 9h, gera o resumo.
cron.schedule("0 9 * * *", () => {
  sendDailyDigest().catch((err) => console.error("[worker] erro no sendDailyDigest", err));
});

// Roda uma vez já na subida, para não esperar o próximo agendamento.
markStaleNumbers().catch((err) => console.error("[worker] erro no markStaleNumbers", err));
syncZapiInstances().catch((err) => console.error("[worker] erro no syncZapiInstances", err));
