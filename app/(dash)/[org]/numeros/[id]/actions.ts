"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrg } from "@/lib/tenant";
import { recordHealthCheck } from "@/lib/checks";

const checkSchema = z.object({
  qualityRating: z.enum(["GREEN", "YELLOW", "RED", "UNKNOWN"]).optional(),
  warningsCount: z.coerce.number().int().min(0).optional(),
  banned: z.coerce.boolean().optional(),
  observation: z.string().optional(),
});

export async function createCheck(orgSlug: string, numberId: string, formData: FormData) {
  const { org, userId } = await requireOrg(orgSlug);

  const qualityRatingRaw = formData.get("qualityRating");
  const data = checkSchema.parse({
    qualityRating: qualityRatingRaw ? qualityRatingRaw : undefined,
    warningsCount: formData.get("warningsCount") || undefined,
    banned: formData.get("banned") === "on",
    observation: formData.get("observation") || undefined,
  });

  await recordHealthCheck({
    orgId: org.id,
    phoneNumberId: numberId,
    userId,
    ...data,
  });

  revalidatePath(`/${orgSlug}/numeros/${numberId}`);
  revalidatePath(`/${orgSlug}/numeros`);
}
