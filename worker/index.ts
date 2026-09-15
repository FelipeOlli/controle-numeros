import "dotenv/config";
import cron from "node-cron";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeHealth } from "../lib/health";
import { dispatchStatusChange } from "../lib/alerts/dispatch";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const STALE_AFTER_HOURS = 72;

/**
 * Marca como UNKNOWN quem não recebe check há mais de 72h e abre incidente.
 * É aqui que os coletores automáticos (fase 2) vão encaixar: rodam antes
 * desta função e gravam HealthCheck com source "API", então a maioria dos
 * números nunca chega a ficar "stale".
 */
async function markStaleNumbers() {
  const cutoff = new Date(Date.now() - STALE_AFTER_HOURS * 60 * 60 * 1000);

  const stale = await prisma.phoneNumber.findMany({
    where: {
      active: true,
      currentStatus: { not: "UNKNOWN" },
      OR: [{ lastCheckAt: null }, { lastCheckAt: { lt: cutoff } }],
    },
  });

  for (const number of stale) {
    const { status, score } = computeHealth({ lastCheckAt: number.lastCheckAt });

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
  const orgs = await prisma.organization.findMany({
    include: { phoneNumbers: true, alertChannels: { where: { enabled: true } } },
  });

  for (const org of orgs) {
    if (org.alertChannels.length === 0) continue;

    const counts: Record<string, number> = {};
    for (const n of org.phoneNumbers) {
      counts[n.currentStatus] = (counts[n.currentStatus] ?? 0) + 1;
    }

    console.log(`[worker] digest ${org.name}:`, counts);
    // O envio efetivo do digest usa os mesmos canais de AlertChannel;
    // fica como próximo passo natural ao lado dos coletores automáticos.
  }
}

console.log("[worker] iniciado");

// A cada hora, verifica números sem check recente.
cron.schedule("0 * * * *", () => {
  markStaleNumbers().catch((err) => console.error("[worker] erro no markStaleNumbers", err));
});

// Todo dia às 9h, gera o resumo.
cron.schedule("0 9 * * *", () => {
  sendDailyDigest().catch((err) => console.error("[worker] erro no sendDailyDigest", err));
});

// Roda uma vez já na subida, para não esperar a próxima hora cheia.
markStaleNumbers().catch((err) => console.error("[worker] erro no markStaleNumbers", err));
