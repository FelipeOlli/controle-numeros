import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole, TenantError } from "@/lib/tenant";
import { handleApiError } from "@/lib/api";
import { CHIP_PLAN_LABELS } from "@/lib/providers";
import type { ChipPlan } from "@/generated/prisma/enums";

const chipPlanValues = Object.keys(CHIP_PLAN_LABELS) as [ChipPlan, ...ChipPlan[]];

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  tier: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
  chipPlan: z.enum(chipPlanValues).optional(),
});

async function loadOwnedNumber(orgId: string, id: string) {
  const number = await prisma.phoneNumber.findUnique({ where: { id } });
  if (!number || number.orgId !== orgId) {
    throw new TenantError("Número não encontrado", 404);
  }
  return number;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  try {
    const { orgSlug, id } = await params;
    const { org } = await requireOrg(orgSlug);
    const number = await loadOwnedNumber(org.id, id);

    const [checks, incidents] = await Promise.all([
      prisma.healthCheck.findMany({
        where: { phoneNumberId: number.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.incident.findMany({
        where: { phoneNumberId: number.id },
        orderBy: { openedAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({ number, checks, incidents });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  try {
    const { orgSlug, id } = await params;
    const { org, role } = await requireOrg(orgSlug);
    requireRole(role, ["OWNER", "ADMIN"]);
    await loadOwnedNumber(org.id, id);

    const body = updateSchema.parse(await req.json());
    const number = await prisma.phoneNumber.update({ where: { id }, data: body });

    return NextResponse.json({ number });
  } catch (err) {
    return handleApiError(err);
  }
}
