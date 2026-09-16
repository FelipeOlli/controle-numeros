import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg } from "@/lib/tenant";
import { handleApiError } from "@/lib/api";
import { recordHealthCheck } from "@/lib/checks";
import { SELECTABLE_STATUSES } from "@/lib/health";

const createSchema = z.object({
  phoneNumberId: z.string(),
  status: z.enum(SELECTABLE_STATUSES),
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
      status: body.status,
      observation: body.observation,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
