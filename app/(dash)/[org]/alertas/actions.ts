"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole } from "@/lib/tenant";

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

export async function createChannel(orgSlug: string, formData: FormData) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

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

  await prisma.alertChannel.create({
    data: { orgId: org.id, kind: channelKind, config },
  });

  revalidatePath(`/${orgSlug}/alertas`);
}

export async function toggleChannel(orgSlug: string, channelId: string, enabled: boolean) {
  const { org, role } = await requireOrg(orgSlug);
  requireRole(role, ["OWNER", "ADMIN"]);

  await prisma.alertChannel.updateMany({
    where: { id: channelId, orgId: org.id },
    data: { enabled },
  });

  revalidatePath(`/${orgSlug}/alertas`);
}
