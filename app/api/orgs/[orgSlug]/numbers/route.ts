import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrg, requireRole } from "@/lib/tenant";
import { handleApiError } from "@/lib/api";

const createSchema = z.object({
  label: z.string().min(1),
  e164: z.string().min(8),
  provider: z.enum(["IUNGO", "CHIP_FISICO", "META_CLOUD", "EVOLUTION", "ZAPI"]),
  externalId: z.string().optional(),
  tier: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  try {
    const { orgSlug } = await params;
    const { org } = await requireOrg(orgSlug);

    const numbers = await prisma.phoneNumber.findMany({
      where: { orgId: org.id },
      orderBy: { label: "asc" },
    });

    return NextResponse.json({ numbers });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  try {
    const { orgSlug } = await params;
    const { org, role } = await requireOrg(orgSlug);
    requireRole(role, ["OWNER", "ADMIN"]);

    const body = createSchema.parse(await req.json());

    const number = await prisma.phoneNumber.create({
      data: { ...body, orgId: org.id },
    });

    return NextResponse.json({ number }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
