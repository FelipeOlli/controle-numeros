"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole, TenantError } from "@/lib/tenant";
import { recordHealthCheck } from "@/lib/checks";
import { SELECTABLE_STATUSES } from "@/lib/health";

const checkSchema = z.object({
  status: z.enum(SELECTABLE_STATUSES),
  observation: z.string().optional(),
});

const updateSchema = z.object({
  label: z.string().min(1),
  e164: z.string().min(8),
  provider: z.enum(["IUNGO", "CHIP_FISICO", "META_CLOUD", "EVOLUTION", "ZAPI"]),
});

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
    provider: formData.get("provider"),
  });

  await prisma.phoneNumber.update({ where: { id: numberId }, data });

  revalidatePath(`/${orgSlug}/numeros/${numberId}`);
  revalidatePath(`/${orgSlug}/numeros`);
  revalidatePath("/painel");
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
