import { prisma } from "@/lib/db";
import type { HealthStatus } from "@/generated/prisma/enums";
import { sendWebhook, type WebhookConfig } from "@/lib/alerts/webhook";
import { sendEmailAlert, type EmailConfig } from "@/lib/alerts/email";
import { sendWhatsappAlert, type WhatsappConfig } from "@/lib/alerts/whatsapp";

interface TransitionInfo {
  orgId: string;
  phoneNumberId: string;
  phoneLabel: string;
  fromStatus: HealthStatus;
  toStatus: HealthStatus;
}

/**
 * Dispara um alerta pros canais globais ativos (valem pra qualquer empresa)
 * e por e-mail pra cada usuário com acesso à empresa que ligou "recebo
 * notificações". Cada tentativa vira um AlertLog, mesmo em caso de falha —
 * é o histórico de auditoria dos avisos. Usada tanto por piora de status
 * quanto por lembrete de recarga — só o assunto/payload muda.
 */
async function dispatchAlert(
  orgId: string,
  phoneNumberId: string,
  subject: string,
  payload: Record<string, string>,
) {
  const [channels, notifyUsers] = await Promise.all([
    prisma.alertChannel.findMany({ where: { enabled: true } }),
    prisma.user.findMany({
      where: { notifyEnabled: true, memberships: { some: { orgId } } },
      select: { id: true, email: true, notifyEmail: true },
    }),
  ]);

  await Promise.all([
    ...channels.map(async (channel) => {
      let ok = true;
      let error: string | undefined;

      try {
        if (channel.kind === "WEBHOOK") {
          await sendWebhook(channel.config as unknown as WebhookConfig, payload);
        } else if (channel.kind === "EMAIL") {
          await sendEmailAlert(
            channel.config as unknown as EmailConfig,
            subject,
            JSON.stringify(payload, null, 2),
          );
        } else if (channel.kind === "WHATSAPP") {
          await sendWhatsappAlert(channel.config as unknown as WhatsappConfig, subject);
        }
      } catch (err) {
        ok = false;
        error = err instanceof Error ? err.message : String(err);
      }

      await prisma.alertLog.create({
        data: {
          orgIdAtDispatch: orgId,
          phoneNumberId,
          channelId: channel.id,
          payload,
          ok,
          error,
        },
      });
    }),
    ...notifyUsers.map(async (user) => {
      let ok = true;
      let error: string | undefined;

      try {
        await sendEmailAlert(
          { to: user.notifyEmail ?? user.email },
          subject,
          JSON.stringify(payload, null, 2),
        );
      } catch (err) {
        ok = false;
        error = err instanceof Error ? err.message : String(err);
      }

      await prisma.alertLog.create({
        data: {
          orgIdAtDispatch: orgId,
          phoneNumberId,
          notifiedUserId: user.id,
          payload,
          ok,
          error,
        },
      });
    }),
  ]);
}

/** Dispara alertas quando o status de um número piora. */
export async function dispatchStatusChange(info: TransitionInfo) {
  const subject = `[${info.toStatus}] ${info.phoneLabel} mudou de ${info.fromStatus} para ${info.toStatus}`;
  const payload = {
    phoneNumberId: info.phoneNumberId,
    phoneLabel: info.phoneLabel,
    fromStatus: info.fromStatus,
    toStatus: info.toStatus,
    at: new Date().toISOString(),
  };

  await dispatchAlert(info.orgId, info.phoneNumberId, subject, payload);
}

/** Dispara o lembrete de recarga de um chip físico perto de vencer. */
export async function dispatchRechargeReminder(info: {
  orgId: string;
  phoneNumberId: string;
  phoneLabel: string;
  nextRechargeAt: Date;
}) {
  const dueDate = info.nextRechargeAt.toLocaleDateString("pt-BR");
  const subject = `[Recarga] ${info.phoneLabel} vence em ${dueDate}`;
  const payload = {
    phoneNumberId: info.phoneNumberId,
    phoneLabel: info.phoneLabel,
    nextRechargeAt: info.nextRechargeAt.toISOString(),
    at: new Date().toISOString(),
  };

  await dispatchAlert(info.orgId, info.phoneNumberId, subject, payload);
}
