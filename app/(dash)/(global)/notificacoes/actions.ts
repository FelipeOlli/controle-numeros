"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const channelSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("EMAIL"), to: z.string().email() }),
  z.object({ kind: z.literal("WEBHOOK"), url: z.string().url() }),
  z.object({
    kind: z.literal("WHATSAPP"),
    sendUrl: z.string().url(),
    apiKey: z.string().min(1),
    to: z.string().min(8),
  }),
]);

async function requireOwnerSomewhere() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");
  const isOwner = session.memberships.some((m) => m.role === "OWNER");
  if (!isOwner) throw new Error("Só quem é OWNER de alguma empresa pode gerenciar notificações");
  return session.user.id;
}

export async function createChannel(formData: FormData) {
  await requireOwnerSomewhere();

  const kind = formData.get("kind");
  const parsed = channelSchema.parse(
    kind === "EMAIL"
      ? { kind, to: formData.get("to") }
      : kind === "WEBHOOK"
        ? { kind, url: formData.get("url") }
        : {
            kind,
            sendUrl: formData.get("sendUrl"),
            apiKey: formData.get("apiKey"),
            to: formData.get("to"),
          },
  );

  const { kind: channelKind, ...config } = parsed;

  await prisma.alertChannel.create({ data: { kind: channelKind, config } });

  revalidatePath("/notificacoes");
}

export async function toggleChannel(channelId: string, enabled: boolean) {
  await requireOwnerSomewhere();

  await prisma.alertChannel.updateMany({ where: { id: channelId }, data: { enabled } });

  revalidatePath("/notificacoes");
}

export async function deleteChannel(channelId: string) {
  await requireOwnerSomewhere();

  await prisma.alertChannel.delete({ where: { id: channelId } });

  revalidatePath("/notificacoes");
}

export async function setNotifyEnabled(enabled: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notifyEnabled: enabled },
  });

  revalidatePath("/notificacoes");
  revalidatePath("/equipe");
}

export async function updateNotifyEmail(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");

  const email = formData.get("notifyEmail");
  const value = typeof email === "string" && email.trim() ? email.trim() : null;
  if (value) {
    z.string().email().parse(value);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notifyEmail: value },
  });

  revalidatePath("/notificacoes");
}
