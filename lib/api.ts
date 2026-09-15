import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { TenantError } from "@/lib/tenant";

export function handleApiError(err: unknown) {
  if (err instanceof TenantError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Dados inválidos", issues: err.issues }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
