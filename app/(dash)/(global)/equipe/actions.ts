"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireOrg, requireRole } from "@/lib/tenant";
import { sendEmailAlert } from "@/lib/alerts/email";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "VIEWER"]),
  orgSlug: z.string().min(1),
});

export async function inviteMember(formData: FormData) {
  const data = inviteSchema.parse({
    email: formData.get("email"),
    role: formData.get("role"),
    orgSlug: formData.get("orgSlug"),
  });

  const { org, role } = await requireOrg(data.orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.invite.create({
    data: { orgId: org.id, email: data.email, role: data.role, token, expiresAt },
  });

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${base}/convite/${token}`;

  try {
    await sendEmailAlert(
      { to: data.email },
      `Convite para ${org.name}`,
      `Você foi convidado para o painel de controle de números de ${org.name}.\n\nAceite o convite: ${link}\n\nO link expira em 7 dias.`,
    );
  } catch {
    // SMTP pode não estar configurado ainda em dev — o convite continua
    // válido e pode ser compartilhado manualmente via link.
  }

  revalidatePath("/equipe");
}

export async function removeMember(orgSlug: string, membershipId: string) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER"]);

  await prisma.membership.deleteMany({ where: { id: membershipId, orgId: org.id } });

  revalidatePath("/equipe");
}

const roleEnum = z.enum(["OWNER", "ADMIN", "VIEWER"]);

export async function changeRole(orgSlug: string, membershipId: string, newRole: string) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER"]);

  const parsedRole = roleEnum.parse(newRole);

  await prisma.membership.updateMany({
    where: { id: membershipId, orgId: org.id },
    data: { role: parsedRole },
  });

  revalidatePath("/equipe");
}

const addAccessSchema = z.object({
  userId: z.string().min(1),
  orgSlug: z.string().min(1),
  role: roleEnum,
});

/** Dá acesso direto a uma empresa pra alguém que já tem conta na plataforma. */
export async function addAccess(formData: FormData) {
  const data = addAccessSchema.parse({
    userId: formData.get("userId"),
    orgSlug: formData.get("orgSlug"),
    role: formData.get("role"),
  });

  const { org, role } = await requireOrg(data.orgSlug);
  requireRole(role, ["OWNER"]);

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: data.userId, orgId: org.id } },
    update: { role: data.role },
    create: { userId: data.userId, orgId: org.id, role: data.role },
  });

  revalidatePath("/equipe");
}

export async function setUserNotify(userId: string, enabled: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");

  const isOwnerSomewhere = session.memberships.some((m) => m.role === "OWNER");
  if (session.user.id !== userId && !isOwnerSomewhere) {
    throw new Error("Sem permissão");
  }

  await prisma.user.update({ where: { id: userId }, data: { notifyEnabled: enabled } });

  revalidatePath("/equipe");
  revalidatePath("/notificacoes");
}
