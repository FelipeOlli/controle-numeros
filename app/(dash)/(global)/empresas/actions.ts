"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireOrg, requireRole, TenantError } from "@/lib/tenant";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";

const nameSchema = z.object({ name: z.string().min(2) });

async function uniqueSlug(base: string) {
  let slug = base || "empresa";
  if (RESERVED_SLUGS.has(slug)) slug = `${slug}-empresa`;

  let candidate = slug;
  let attempt = 1;
  while (await prisma.organization.findUnique({ where: { slug: candidate } })) {
    attempt += 1;
    candidate = `${slug}-${attempt}`;
  }
  return candidate;
}

export async function createOrganization(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Não autenticado");
  }

  const isOwnerSomewhere = session.memberships.some((m) => m.role === "OWNER");
  if (!isOwnerSomewhere) {
    throw new Error("Só quem já é OWNER de uma empresa pode cadastrar novas empresas");
  }

  const { name } = nameSchema.parse({ name: formData.get("name") });
  const slug = await uniqueSlug(slugify(name));

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      memberships: { create: { userId: session.user.id, role: "OWNER" } },
    },
  });

  redirect(`/${org.slug}/numeros`);
}

export async function updateOrganization(orgSlug: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER"]);

  const { name } = nameSchema.parse({ name: formData.get("name") });
  await prisma.organization.update({ where: { id: org.id }, data: { name } });

  revalidatePath("/empresas");
  revalidatePath(`/${orgSlug}/numeros`);
  revalidatePath("/painel");
}

/**
 * Exclui uma empresa. Se ela tiver números vinculados, exige um `mode`
 * explícito escolhido no modal de confirmação: migrar todos pra outra
 * empresa (mantendo histórico) ou excluir os números junto (cascade).
 */
export async function deleteOrganization(orgSlug: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER"]);

  const mode = formData.get("mode");
  const targetSlug = formData.get("targetOrgSlug");

  const numbers = await prisma.phoneNumber.findMany({
    where: { orgId: org.id },
    select: { e164: true },
  });

  if (numbers.length > 0) {
    if (mode === "migrate") {
      if (typeof targetSlug !== "string" || !targetSlug) {
        throw new Error("Escolha a empresa de destino");
      }

      const { org: targetOrg } = await requireOrg(targetSlug);
      if (targetOrg.id === org.id) {
        throw new TenantError("Escolha uma empresa diferente da atual", 400);
      }

      const collisions = await prisma.phoneNumber.findMany({
        where: { orgId: targetOrg.id, e164: { in: numbers.map((n) => n.e164) } },
        select: { e164: true },
      });
      if (collisions.length > 0) {
        throw new Error(
          `Já existe número com esse E.164 na empresa de destino: ${collisions
            .map((c) => c.e164)
            .join(", ")}. Ajuste antes de migrar.`,
        );
      }

      await prisma.$transaction([
        prisma.phoneNumber.updateMany({
          where: { orgId: org.id },
          data: { orgId: targetOrg.id },
        }),
        prisma.organization.delete({ where: { id: org.id } }),
      ]);

      revalidatePath(`/${targetSlug}/numeros`);
    } else if (mode === "delete-numbers") {
      // Cascade do schema apaga PhoneNumber -> HealthCheck/Incident junto.
      await prisma.organization.delete({ where: { id: org.id } });
    } else {
      throw new Error(
        "Essa empresa tem números vinculados — escolha migrar ou excluir os números antes.",
      );
    }
  } else {
    await prisma.organization.delete({ where: { id: org.id } });
  }

  revalidatePath("/empresas");
  revalidatePath("/painel");
  redirect("/empresas");
}
