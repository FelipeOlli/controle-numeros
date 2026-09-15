import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg } from "@/lib/tenant";
import { handleApiError } from "@/lib/api";
import { recordHealthCheck } from "@/lib/checks";

const createSchema = z.object({
  phoneNumberId: z.string(),
  qualityRating: z.enum(["GREEN", "YELLOW", "RED", "UNKNOWN"]).optional(),
  warningsCount: z.number().int().min(0).optional(),
  banned: z.boolean().optional(),
  observation: z.string().optional(),
  // Coletores automáticos (fase 2) chamam esta rota com source: "API".
  source: z.enum(["MANUAL", "API"]).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  try {
    const { orgSlug } = await params;
    const { org, userId } = await requireOrg(orgSlug);
    const body = createSchema.parse(await req.json());

    const result = await recordHealthCheck({
      orgId: org.id,
      phoneNumberId: body.phoneNumberId,
      userId,
      source: body.source,
      qualityRating: body.qualityRating,
      warningsCount: body.warningsCount,
      banned: body.banned,
      observation: body.observation,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
