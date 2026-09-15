"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth, signIn } from "@/lib/auth";

async function loadValidInvite(token: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new Error("Convite inválido ou expirado");
  }
  return invite;
}

async function acceptForUser(inviteId: string, orgId: string, role: "ADMIN" | "VIEWER", userId: string) {
  await prisma.$transaction([
    prisma.membership.upsert({
      where: { userId_orgId: { userId, orgId } },
      update: {},
      create: { userId, orgId, role },
    }),
    prisma.invite.update({ where: { id: inviteId }, data: { acceptedAt: new Date() } }),
  ]);
}

export async function acceptInviteLoggedIn(token: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");

  const invite = await loadValidInvite(token);
  await acceptForUser(invite.id, invite.orgId, invite.role as "ADMIN" | "VIEWER", session.user.id);

  const org = await prisma.organization.findUnique({ where: { id: invite.orgId } });
  redirect(`/${org?.slug ?? ""}/numeros`);
}

const signupSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(8),
});

export async function signupAndAcceptInvite(token: string, formData: FormData) {
  const invite = await loadValidInvite(token);

  const data = signupSchema.parse({
    name: formData.get("name"),
    password: formData.get("password"),
  });

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) {
    // Já existe conta com esse e-mail: não deixamos definir senha nova por
    // aqui (seria um jeito de sequestrar a conta). A pessoa precisa logar
    // normalmente e aceitar o convite autenticada.
    redirect(`/login?convite=${token}`);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { email: invite.email, name: data.name, passwordHash },
  });

  await acceptForUser(invite.id, invite.orgId, invite.role as "ADMIN" | "VIEWER", user.id);

  const org = await prisma.organization.findUnique({ where: { id: invite.orgId } });

  await signIn("credentials", {
    email: invite.email,
    password: data.password,
    redirectTo: `/${org?.slug ?? ""}/numeros`,
  });
}
