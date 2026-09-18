"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole, TenantError } from "@/lib/tenant";

const createSchema = z.object({
  label: z.string().min(1),
  e164: z.string().min(8),
  provider: z.enum(["IUNGO", "CHIP_FISICO", "META_CLOUD", "EVOLUTION", "ZAPI"]),
  externalId: z.string().optional(),
});

export async function createNumber(orgSlug: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const data = createSchema.parse({
    label: formData.get("label"),
    e164: formData.get("e164"),
    provider: formData.get("provider"),
    externalId: formData.get("externalId") || undefined,
  });

  await prisma.phoneNumber.create({ data: { ...data, orgId: org.id } });

  revalidatePath(`/${orgSlug}/numeros`);
  revalidatePath("/painel");
}

const zapiCredentialSchema = z.object({
  partnerToken: z.string().min(1),
});

/**
 * Guarda o Partner-Token da conta Z-API (programa "Parceiro Integrador") —
 * é ele que dá acesso à listagem com conexão + pagamento + vencimento de
 * cada instância. Nunca é reexibido depois de salvo.
 */
export async function saveZapiCredential(orgSlug: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const { partnerToken } = zapiCredentialSchema.parse({
    partnerToken: formData.get("partnerToken"),
  });

  await prisma.providerCredential.upsert({
    where: { orgId_provider: { orgId: org.id, provider: "ZAPI" } },
    create: { orgId: org.id, provider: "ZAPI", config: { partnerToken } },
    update: { config: { partnerToken } },
  });

  revalidatePath(`/${orgSlug}/numeros`);
}

export async function deleteNumber(orgSlug: string, numberId: string) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const number = await prisma.phoneNumber.findUnique({ where: { id: numberId } });
  if (!number || number.orgId !== org.id) {
    throw new TenantError("Número não encontrado", 404);
  }

  await prisma.phoneNumber.delete({ where: { id: numberId } });

  revalidatePath(`/${orgSlug}/numeros`);
  revalidatePath("/painel");
  redirect(`/${orgSlug}/numeros`);
}
