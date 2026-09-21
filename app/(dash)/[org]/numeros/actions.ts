"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole, TenantError } from "@/lib/tenant";
import { syncZapiForOrg, type ZapiSyncResult } from "@/lib/providers/zapi-sync";
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

const createSchema = z
  .object({
    label: z.string().min(1),
    e164: z.string().min(8),
    origin: z.enum(originValues),
    platforms: z.array(z.enum(platformValues)),
    externalId: z.string().optional(),
    providerToken: z.string().optional(),
    carrier: z.enum(carrierValues).optional(),
    lastRechargeAt: z.string().optional(),
  })
  .refine((data) => data.origin !== "CHIP_FISICO" || data.lastRechargeAt, {
    message: "Informe a data da última recarga pra números de chip físico",
    path: ["lastRechargeAt"],
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
    carrier: formData.get("carrier") || undefined,
    lastRechargeAt: formData.get("lastRechargeAt") || undefined,
  });

  const lastRechargeAt = data.lastRechargeAt ? new Date(data.lastRechargeAt) : null;

  await prisma.phoneNumber.create({
    data: {
      label: data.label,
      e164: data.e164,
      origin: data.origin,
      platforms: resolvePlatforms(data.origin, data.platforms),
      externalId: data.externalId,
      providerToken: data.providerToken,
      orgId: org.id,
      carrier: data.origin === "CHIP_FISICO" ? (data.carrier ?? null) : null,
      lastRechargeAt,
      nextRechargeAt: lastRechargeAt ? computeNextRecharge(lastRechargeAt) : null,
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
