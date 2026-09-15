import { prisma } from "@/lib/db";
import { TenantError } from "@/lib/tenant";
import { computeHealth, type QualityRating } from "@/lib/health";
import { dispatchStatusChange } from "@/lib/alerts/dispatch";
import type { CheckSource } from "@/generated/prisma/enums";

export interface RecordCheckInput {
  orgId: string;
  phoneNumberId: string;
  userId?: string;
  source?: CheckSource;
  qualityRating?: QualityRating;
  warningsCount?: number;
  banned?: boolean;
  observation?: string;
}

function statusRank(status: string) {
  switch (status) {
    case "GREEN":
      return 3;
    case "YELLOW":
      return 2;
    case "RED":
    case "UNKNOWN":
      return 1;
    case "BANNED":
      return 0;
    default:
      return 1;
  }
}

/**
 * Grava um HealthCheck, atualiza o cache em PhoneNumber, abre incidente na
 * transição e dispara alerta se o status piorou. Usada tanto pelo formulário
 * manual (server action) quanto pela API pública — única dona da regra.
 */
export async function recordHealthCheck(input: RecordCheckInput) {
  const number = await prisma.phoneNumber.findUnique({
    where: { id: input.phoneNumberId },
  });
  if (!number || number.orgId !== input.orgId) {
    throw new TenantError("Número não encontrado", 404);
  }

  const openIncidents = await prisma.incident.count({
    where: {
      phoneNumberId: number.id,
      resolvedAt: null,
      openedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  const { score, status } = computeHealth({
    qualityRating: input.qualityRating,
    warningsCount: input.warningsCount,
    openIncidentsLast30d: openIncidents,
    lastCheckAt: new Date(),
    banned: input.banned,
  });

  const previousStatus = number.currentStatus;

  const result = await prisma.$transaction(async (tx) => {
    const check = await tx.healthCheck.create({
      data: {
        phoneNumberId: number.id,
        status,
        score,
        source: input.source ?? "MANUAL",
        qualityRating: input.qualityRating,
        warningsCount: input.warningsCount,
        observation: input.observation,
        createdById: input.userId,
      },
    });

    const updated = await tx.phoneNumber.update({
      where: { id: number.id },
      data: { currentStatus: status, currentScore: score, lastCheckAt: check.createdAt },
    });

    if (previousStatus !== status) {
      await tx.incident.create({
        data: { phoneNumberId: number.id, fromStatus: previousStatus, toStatus: status },
      });
    }

    return { check, number: updated };
  });

  if (statusRank(status) < statusRank(previousStatus)) {
    await dispatchStatusChange({
      orgId: input.orgId,
      phoneNumberId: number.id,
      phoneLabel: number.label,
      fromStatus: previousStatus,
      toStatus: status,
    });
  }

  return result;
}
