"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole } from "@/lib/tenant";
import { sendEmailAlert } from "@/lib/alerts/email";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "VIEWER"]),
});

export async function inviteMember(orgSlug: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  const data = inviteSchema.parse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

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

  revalidatePath(`/${orgSlug}/equipe`);
}

export async function removeMember(orgSlug: string, membershipId: string) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER"]);

  await prisma.membership.deleteMany({ where: { id: membershipId, orgId: org.id } });

  revalidatePath(`/${orgSlug}/equipe`);
}
