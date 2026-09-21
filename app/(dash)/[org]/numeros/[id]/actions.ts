"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole, TenantError } from "@/lib/tenant";
import { recordHealthCheck } from "@/lib/checks";
import { SELECTABLE_STATUSES } from "@/lib/health";
import {
  ORIGIN_LABELS,
  PLATFORM_LABELS,
  CARRIER_LABELS,
  resolvePlatforms,
  computeNextRecharge,
} from "@/lib/providers";
import type { NumberOrigin, NumberPlatform, Carrier } from "@/generated/prisma/enums";

const originValues = Object.keys(ORIGIN_LABELS) as [NumberOrigin, ...NumberOrigin[]];
const platformValues = Object.keys(PLATFORM_LABELS) as [NumberPlatform, ...NumberPlatform[]];
const carrierValues = Object.keys(CARRIER_LABELS) as [Carrier, ...Carrier[]];

const checkSchema = z.object({
  status: z.enum(SELECTABLE_STATUSES),
  observation: z.string().optional(),
});

const updateSchema = z.object({
  label: z.string().min(1),
  e164: z.string().min(8),
  origin: z.enum(originValues),
  platforms: z.array(z.enum(platformValues)),
  externalId: z.string().optional(),
  providerToken: z.string().optional(),
  targetOrgSlug: z.string().optional(),
});

/**
 * Edita label/E.164/origem e, opcionalmente, move o número pra outra
 * empresa (mantendo HealthCheck/Incident — eles não têm orgId, seguem o
 * número sozinhos). Exige OWNER/ADMIN nas duas empresas quando muda.
 */
export async function updateNumber(orgSlug: string, numberId: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const number = await prisma.phoneNumber.findUnique({ where: { id: numberId } });
  if (!number || number.orgId !== org.id) {
    throw new TenantError("Número não encontrado", 404);
  }

  const data = updateSchema.parse({
    label: formData.get("label"),
    e164: formData.get("e164"),
    origin: formData.get("origin"),
    platforms: formData.getAll("platforms"),
    externalId: formData.get("externalId") || undefined,
    providerToken: formData.get("providerToken") || undefined,
    targetOrgSlug: formData.get("targetOrgSlug") || undefined,
  });

  const platforms = resolvePlatforms(data.origin, data.platforms);
  const isMoving = data.targetOrgSlug && data.targetOrgSlug !== orgSlug;

  if (isMoving) {
    const { org: targetOrg, role: targetRole } = await requireOrg(data.targetOrgSlug!);
    requireRole(targetRole, ["OWNER", "ADMIN"]);

    const collision = await prisma.phoneNumber.findUnique({
      where: { orgId_e164: { orgId: targetOrg.id, e164: data.e164 } },
    });
    if (collision) {
      throw new Error("Já existe um número com esse E.164 na empresa de destino");
    }

    await prisma.phoneNumber.update({
      where: { id: numberId },
      data: {
        label: data.label,
        e164: data.e164,
        origin: data.origin,
        platforms,
        externalId: data.externalId,
        providerToken: data.providerToken,
        orgId: targetOrg.id,
      },
    });

    revalidatePath(`/${orgSlug}/numeros`);
    revalidatePath(`/${data.targetOrgSlug}/numeros`);
    revalidatePath("/painel");
    redirect(`/${data.targetOrgSlug}/numeros/${numberId}`);
  }

  await prisma.phoneNumber.update({
    where: { id: numberId },
    data: {
      label: data.label,
      e164: data.e164,
      origin: data.origin,
      platforms,
      externalId: data.externalId,
      providerToken: data.providerToken,
    },
  });

  revalidatePath(`/${orgSlug}/numeros/${numberId}`);
  revalidatePath(`/${orgSlug}/numeros`);
  revalidatePath("/painel");
}

const billingSchema = z.object({
  providerDueAt: z.string().optional(),
  providerPaymentStatus: z.string().optional(),
});

/**
 * Vencimento e status de pagamento não têm endpoint na conta Z-API
 * "Cliente" — só existem no painel web deles. Atualizado manualmente aqui.
 */
export async function updateZapiBilling(orgSlug: string, numberId: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const number = await prisma.phoneNumber.findUnique({ where: { id: numberId } });
  if (!number || number.orgId !== org.id) {
    throw new TenantError("Número não encontrado", 404);
  }

  const data = billingSchema.parse({
    providerDueAt: formData.get("providerDueAt") || undefined,
    providerPaymentStatus: formData.get("providerPaymentStatus") || undefined,
  });

  await prisma.phoneNumber.update({
    where: { id: numberId },
    data: {
      providerDueAt: data.providerDueAt ? new Date(data.providerDueAt) : null,
      providerPaymentStatus: data.providerPaymentStatus ?? null,
    },
  });

  revalidatePath(`/${orgSlug}/numeros/${numberId}`);
}

const rechargeSchema = z.object({
  carrier: z.enum(carrierValues).optional(),
  lastRechargeAt: z.string().optional(),
  nextRechargeAt: z.string().optional(),
});

/**
 * Recarga do chip físico — sem crédito a cada ~3 meses, a operadora recolhe
 * o número. Zera rechargeReminderSentAt sempre que a data muda, pra poder
 * alertar de novo no próximo ciclo (lib/alerts/dispatch.ts, via worker).
 */
export async function updateRecharge(orgSlug: string, numberId: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const number = await prisma.phoneNumber.findUnique({ where: { id: numberId } });
  if (!number || number.orgId !== org.id) {
    throw new TenantError("Número não encontrado", 404);
  }

  const data = rechargeSchema.parse({
    carrier: formData.get("carrier") || undefined,
    lastRechargeAt: formData.get("lastRechargeAt") || undefined,
    nextRechargeAt: formData.get("nextRechargeAt") || undefined,
  });

  await prisma.phoneNumber.update({
    where: { id: numberId },
    data: {
      carrier: data.carrier ?? null,
      lastRechargeAt: data.lastRechargeAt ? new Date(data.lastRechargeAt) : null,
      nextRechargeAt: data.nextRechargeAt ? new Date(data.nextRechargeAt) : null,
      rechargeReminderSentAt: null,
    },
  });

  revalidatePath(`/${orgSlug}/numeros/${numberId}`);
}

/** Botão "Recarregar agora" — hoje é a última recarga, +90 dias é a próxima. */
export async function quickRecharge(orgSlug: string, numberId: string) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const number = await prisma.phoneNumber.findUnique({ where: { id: numberId } });
  if (!number || number.orgId !== org.id) {
    throw new TenantError("Número não encontrado", 404);
  }

  const now = new Date();

  await prisma.phoneNumber.update({
    where: { id: numberId },
    data: { lastRechargeAt: now, nextRechargeAt: computeNextRecharge(now), rechargeReminderSentAt: null },
  });

  revalidatePath(`/${orgSlug}/numeros/${numberId}`);
}

export async function createCheck(orgSlug: string, numberId: string, formData: FormData) {
  const { org, userId } = await requireOrg(orgSlug);

  const data = checkSchema.parse({
    status: formData.get("status"),
    observation: formData.get("observation") || undefined,
  });

  await recordHealthCheck({
    orgId: org.id,
    phoneNumberId: numberId,
    userId,
    ...data,
  });

  revalidatePath(`/${orgSlug}/numeros/${numberId}`);
  revalidatePath(`/${orgSlug}/numeros`);
  revalidatePath("/painel");
}
