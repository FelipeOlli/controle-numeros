"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole, TenantError } from "@/lib/tenant";
import { syncZapiForOrg, type ZapiSyncResult } from "@/lib/providers/zapi-sync";
import { syncMetaForOrg, type MetaSyncResult } from "@/lib/providers/meta-sync";
import {
  ORIGIN_LABELS,
  PLATFORM_LABELS,
  CARRIER_LABELS,
  CHIP_PLAN_LABELS,
  resolvePlatforms,
  computeNextRecharge,
  tracksRecharge,
} from "@/lib/providers";
import type { NumberOrigin, NumberPlatform, Carrier, ChipPlan } from "@/generated/prisma/enums";

const originValues = Object.keys(ORIGIN_LABELS) as [NumberOrigin, ...NumberOrigin[]];
const platformValues = Object.keys(PLATFORM_LABELS) as [NumberPlatform, ...NumberPlatform[]];
const carrierValues = Object.keys(CARRIER_LABELS) as [Carrier, ...Carrier[]];
const chipPlanValues = Object.keys(CHIP_PLAN_LABELS) as [ChipPlan, ...ChipPlan[]];

const createSchema = z
  .object({
    label: z.string().min(1),
    e164: z.string().min(8),
    origin: z.enum(originValues),
    platforms: z.array(z.enum(platformValues)),
    externalId: z.string().optional(),
    providerToken: z.string().optional(),
    chipPlan: z.enum(chipPlanValues).optional(),
    carrier: z.enum(carrierValues).optional(),
    lastRechargeAt: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => !tracksRecharge(data.origin, data.chipPlan ?? null) || data.lastRechargeAt, {
    message: "Informe a data da última recarga pra chip físico pré-pago",
    path: ["lastRechargeAt"],
  })
  .refine((data) => data.origin !== "CHIP_FISICO" || data.carrier, {
    message: "Informe a operadora do chip físico",
    path: ["carrier"],
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
    chipPlan: formData.get("chipPlan") || undefined,
    carrier: formData.get("carrier") || undefined,
    lastRechargeAt: formData.get("lastRechargeAt") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const isChipFisico = data.origin === "CHIP_FISICO";
  const chipPlan = isChipFisico ? (data.chipPlan ?? "PRE_PAGO") : null;
  const willTrackRecharge = tracksRecharge(data.origin, chipPlan);
  const lastRechargeAt = willTrackRecharge && data.lastRechargeAt ? new Date(data.lastRechargeAt) : null;

  await prisma.phoneNumber.create({
    data: {
      label: data.label,
      e164: data.e164,
      origin: data.origin,
      platforms: resolvePlatforms(data.origin, data.platforms),
      externalId: data.externalId,
      providerToken: data.providerToken,
      orgId: org.id,
      chipPlan,
      carrier: isChipFisico ? (data.carrier ?? null) : null,
      lastRechargeAt,
      nextRechargeAt: lastRechargeAt ? computeNextRecharge(lastRechargeAt) : null,
      notes: isChipFisico ? (data.notes ?? null) : null,
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

const metaCredentialSchema = z.object({
  wabaId: z.string().min(1),
  accessToken: z.string().min(1),
});

/**
 * Guarda o WABA ID e o system user access token (Business Settings →
 * Usuários do sistema → gerar token com whatsapp_business_management) —
 * vale pra todos os números vinculados a META_CLOUD nessa empresa. O token
 * nunca é reexibido; o WABA ID não é segredo, por isso pode ser mostrado.
 */
export async function saveMetaCredential(orgSlug: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const { wabaId, accessToken } = metaCredentialSchema.parse({
    wabaId: formData.get("wabaId"),
    accessToken: formData.get("accessToken"),
  });

  await prisma.providerCredential.upsert({
    where: { orgId_platform: { orgId: org.id, platform: "META_CLOUD" } },
    create: { orgId: org.id, platform: "META_CLOUD", config: { wabaId, accessToken } },
    update: { config: { wabaId, accessToken } },
  });

  revalidatePath(`/${orgSlug}/numeros`);
}

/** Botão "Sincronizar agora" — mesma sincronização do worker, sob demanda. */
export async function syncMetaNow(orgSlug: string): Promise<MetaSyncResult> {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const result = await syncMetaForOrg(org.id);

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
