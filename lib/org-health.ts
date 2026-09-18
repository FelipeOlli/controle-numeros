import { prisma } from "@/lib/db";
import type { HealthStatus } from "@/generated/prisma/enums";

export type OrgHealth = {
  orgId: string;
  total: number;
  healthyCount: number;
  healthyPct: number;
  countsByStatus: Record<HealthStatus, number>;
};

function emptyHealth(orgId: string): OrgHealth {
  return {
    orgId,
    total: 0,
    healthyCount: 0,
    healthyPct: 0,
    countsByStatus: { GREEN: 0, YELLOW: 0, RED: 0, BANNED: 0, LOST: 0, UNKNOWN: 0 },
  };
}

/**
 * Composição de status por empresa — alimenta o radar do painel e a linha
 * "3 números · 2 saudáveis · 1 crítico" nos cards de empresa.
 */
export async function getOrgHealth(orgIds: string[]): Promise<Map<string, OrgHealth>> {
  const map = new Map<string, OrgHealth>();
  for (const orgId of orgIds) {
    map.set(orgId, emptyHealth(orgId));
  }
  if (orgIds.length === 0) return map;

  const rows = await prisma.phoneNumber.groupBy({
    by: ["orgId", "currentStatus"],
    where: { orgId: { in: orgIds } },
    _count: { _all: true },
  });

  for (const row of rows) {
    const entry = map.get(row.orgId);
    if (!entry) continue;
    entry.countsByStatus[row.currentStatus] = row._count._all;
    entry.total += row._count._all;
  }

  for (const entry of map.values()) {
    entry.healthyCount = entry.countsByStatus.GREEN;
    entry.healthyPct = entry.total ? Math.round((entry.healthyCount / entry.total) * 100) : 0;
  }

  return map;
}

/** "3 números · 2 saudáveis · 1 crítico" — cards de empresa (tela 3a). */
export function formatOrgHealthSummary(health: OrgHealth): string {
  if (health.total === 0) return "Nenhum número";

  const parts = [`${health.total} número${health.total === 1 ? "" : "s"}`];
  if (health.healthyCount > 0) {
    parts.push(`${health.healthyCount} saudáve${health.healthyCount === 1 ? "l" : "is"}`);
  }

  const { countsByStatus } = health;
  const critical = countsByStatus.RED + countsByStatus.BANNED;
  if (critical > 0) {
    parts.push(`${critical} crítico${critical === 1 ? "" : "s"}`);
  } else if (countsByStatus.YELLOW > 0) {
    parts.push(`${countsByStatus.YELLOW} em atenção`);
  } else if (countsByStatus.LOST + countsByStatus.UNKNOWN > 0) {
    parts.push(`${countsByStatus.LOST + countsByStatus.UNKNOWN} sem dados`);
  }

  return parts.join(" · ");
}
