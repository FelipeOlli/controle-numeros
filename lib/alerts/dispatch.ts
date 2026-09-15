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
 * Dispara alertas para todos os canais ativos da org quando o status de um
 * número piora. Cada tentativa vira um AlertLog, mesmo em caso de falha —
 * é o histórico de auditoria dos avisos.
 */
export async function dispatchStatusChange(info: TransitionInfo) {
  const channels = await prisma.alertChannel.findMany({
    where: { orgId: info.orgId, enabled: true },
  });

  const subject = `[${info.toStatus}] ${info.phoneLabel} mudou de ${info.fromStatus} para ${info.toStatus}`;
  const payload = {
    phoneNumberId: info.phoneNumberId,
    phoneLabel: info.phoneLabel,
    fromStatus: info.fromStatus,
    toStatus: info.toStatus,
    at: new Date().toISOString(),
  };

  await Promise.all(
    channels.map(async (channel) => {
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
          orgId: info.orgId,
          phoneNumberId: info.phoneNumberId,
          channelId: channel.id,
          payload,
          ok,
          error,
        },
      });
    }),
  );
}
