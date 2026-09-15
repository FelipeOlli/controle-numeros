import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

export class TenantError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolve a organização a partir do slug da rota e garante que o usuário
 * logado é membro dela. Toda rota/handler sob /[org]/... deve passar por aqui
 * antes de tocar em qualquer dado — nunca confiar em orgId vindo do client.
 */
export async function requireOrg(orgSlug: string) {
  const session = await auth();
  if (!session?.user) {
    throw new TenantError("Não autenticado", 401);
  }

  const membership = session.memberships.find((m) => m.orgSlug === orgSlug);
  if (!membership) {
    // 404 em vez de 403: não confirma para o usuário que a org existe.
    throw new TenantError("Organização não encontrada", 404);
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.orgId },
  });
  if (!org) {
    throw new TenantError("Organização não encontrada", 404);
  }

  return { org, role: membership.role as Role, userId: session.user.id };
}

export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    throw new TenantError("Sem permissão para esta ação", 403);
  }
}
