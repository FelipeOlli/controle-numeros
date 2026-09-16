"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";

const schema = z.object({ name: z.string().min(2) });

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

  const { name } = schema.parse({ name: formData.get("name") });
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
