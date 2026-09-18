"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole, TenantError } from "@/lib/tenant";
import { syncZapiForOrg, type ZapiSyncResult } from "@/lib/providers/zapi-sync";
import { ORIGIN_LABELS, PLATFORM_LABELS, resolvePlatforms } from "@/lib/providers";
import type { NumberOrigin, NumberPlatform } from "@/generated/prisma/enums";

const originValues = Object.keys(ORIGIN_LABELS) as [NumberOrigin, ...NumberOrigin[]];
const platformValues = Object.keys(PLATFORM_LABELS) as [NumberPlatform, ...NumberPlatform[]];

const createSchema = z.object({
  label: z.string().min(1),
  e164: z.string().min(8),
  origin: z.enum(originValues),
  platforms: z.array(z.enum(platformValues)),
  externalId: z.string().optional(),
  providerToken: z.string().optional(),
});

export async function createNumber(orgSlug: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const data = createSchema.parse({
    label: formData.get("label"),
    e164: formData.get("e164"),
    origin: formData.get("origin"),
    platforms: formData.getAll("platforms"),
    externalId: formData.get("externalId") || undefined,
    providerToken: formData.get("providerToken") || undefined,
  });

  await prisma.phoneNumber.create({
    data: {
      ...data,
      platforms: resolvePlatforms(data.origin, data.platforms),
      orgId: org.id,
    },
  });

  revalidatePath(`/${orgSlug}/numeros`);
  revalidatePath("/painel");
}

const zapiCredentialSchema = z.object({
  clientToken: z.string().min(1),
});

/**
 * Guarda o Client-Token da conta Z-API (aba Segurança → "Token de segurança
 * da conta") — vale pra qualquer chamada por instância. Nunca é reexibido
 * depois de salvo.
 */
export async function saveZapiCredential(orgSlug: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const { clientToken } = zapiCredentialSchema.parse({
    clientToken: formData.get("clientToken"),
  });

  await prisma.providerCredential.upsert({
    where: { orgId_platform: { orgId: org.id, platform: "ZAPI" } },
    create: { orgId: org.id, platform: "ZAPI", config: { clientToken } },
    update: { config: { clientToken } },
  });

  revalidatePath(`/${orgSlug}/numeros`);
}

/** Botão "Sincronizar agora" — mesma sincronização do worker, sob demanda. */
export async function syncZapiNow(orgSlug: string): Promise<ZapiSyncResult> {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const result = await syncZapiForOrg(org.id);

  revalidatePath(`/${orgSlug}/numeros`);
  revalidatePath("/[org]/numeros/[id]", "page");
  revalidatePath("/painel");

  return result;
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
