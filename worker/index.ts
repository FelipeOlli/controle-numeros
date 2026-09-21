import "dotenv/config";
import cron from "node-cron";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { isStale } from "../lib/health";
import { dueDateStatus } from "../lib/format";
import { dispatchStatusChange, dispatchRechargeReminder } from "../lib/alerts/dispatch";
import { syncAllZapiCredentials } from "../lib/providers/zapi-sync";

const RECHARGE_REMINDER_DAYS = 7;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Marca como UNKNOWN quem não recebe check há mais de 72h e abre incidente.
 * É aqui que os coletores automáticos (fase 2) vão encaixar: rodam antes
 * desta função e gravam HealthCheck com source "API", então a maioria dos
 * números nunca chega a ficar "stale".
 *
 * Número Z-API estável não muda de status, então lastCheckAt nunca atualiza
 * mesmo sincronizando a cada 10min (lib/providers/zapi-sync.ts só grava
 * HealthCheck quando o status muda de fato). Por isso, pra Z-API, usa o mais
 * recente entre lastCheckAt e lastSyncAt — sem isso o worker marcaria como
 * "sem dados" um número que o Z-API acabou de confirmar conectado.
 */
async function markStaleNumbers() {
  const candidates = await prisma.phoneNumber.findMany({
    where: { active: true, currentStatus: { not: "UNKNOWN" } },
  });

  const stale = candidates.filter((n) => {
    const effectiveLastCheck =
      n.platforms.includes("ZAPI") && n.lastSyncAt && (!n.lastCheckAt || n.lastSyncAt > n.lastCheckAt)
        ? n.lastSyncAt
        : n.lastCheckAt;
    return isStale(effectiveLastCheck);
  });

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
 * Lembrete de recarga: chip físico sem crédito a cada ~3 meses perde o
 * número. Dispara uma vez por ciclo (debounce em rechargeReminderSentAt,
 * resetado sempre que a data muda) quando faltam poucos dias pro
 * vencimento.
 */
async function checkRechargeReminders() {
  const candidates = await prisma.phoneNumber.findMany({
    where: {
      active: true,
      origin: "CHIP_FISICO",
      chipPlan: { not: "POS_PAGO" },
      nextRechargeAt: { not: null },
      rechargeReminderSentAt: null,
    },
  });

  for (const number of candidates) {
    const { daysUntil } = dueDateStatus(number.nextRechargeAt!);
    if (daysUntil > RECHARGE_REMINDER_DAYS) continue;

    await dispatchRechargeReminder({
      orgId: number.orgId,
      phoneNumberId: number.id,
      phoneLabel: number.label,
      nextRechargeAt: number.nextRechargeAt!,
    });

    await prisma.phoneNumber.update({
      where: { id: number.id },
      data: { rechargeReminderSentAt: new Date() },
    });

    console.log(`[worker] lembrete de recarga enviado pra ${number.label} (${daysUntil} dia(s))`);
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

// Todo dia às 7h, gera o resumo e verifica lembretes de recarga.
cron.schedule("0 7 * * *", () => {
  sendDailyDigest().catch((err) => console.error("[worker] erro no sendDailyDigest", err));
  checkRechargeReminders().catch((err) => console.error("[worker] erro no checkRechargeReminders", err));
});

// Roda uma vez já na subida, para não esperar o próximo agendamento.
markStaleNumbers().catch((err) => console.error("[worker] erro no markStaleNumbers", err));
syncAllZapiCredentials().catch((err) => console.error("[worker] erro no syncAllZapiCredentials", err));
checkRechargeReminders().catch((err) => console.error("[worker] erro no checkRechargeReminders", err));
