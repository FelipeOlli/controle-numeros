import "dotenv/config";
import cron from "node-cron";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { isStale } from "../lib/health";
import { dispatchStatusChange } from "../lib/alerts/dispatch";
import { syncAllZapiCredentials } from "../lib/providers/zapi-sync";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

// A cada 10 minutos, sincroniza conexão/pagamento/vencimento das instâncias Z-API.
cron.schedule("*/10 * * * *", () => {
  syncAllZapiCredentials().catch((err) => console.error("[worker] erro no syncAllZapiCredentials", err));
});

// Todo dia às 7h, gera o resumo.
cron.schedule("0 7 * * *", () => {
  sendDailyDigest().catch((err) => console.error("[worker] erro no sendDailyDigest", err));
});

// Roda uma vez já na subida, para não esperar o próximo agendamento.
markStaleNumbers().catch((err) => console.error("[worker] erro no markStaleNumbers", err));
syncAllZapiCredentials().catch((err) => console.error("[worker] erro no syncAllZapiCredentials", err));
