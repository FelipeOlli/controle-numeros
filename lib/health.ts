import type { HealthStatus } from "@/generated/prisma/enums";

/** Status que podem ser escolhidos diretamente num check manual. */
export const SELECTABLE_STATUSES = ["GREEN", "YELLOW", "RED", "BANNED", "LOST"] as const;
export type SelectableStatus = (typeof SELECTABLE_STATUSES)[number];

export const STATUS_LABELS: Record<HealthStatus, string> = {
  GREEN: "Saudável",
  YELLOW: "Atenção",
  RED: "Crítico",
  BANNED: "Banido no WhatsApp",
  LOST: "Número perdido",
  UNKNOWN: "Sem dados",
};

/**
 * O status é escolhido diretamente (não mais calculado a partir de
 * qualidade/avisos/incidentes) — o score é só uma projeção fixa dele,
 * usada pro anel visual e pra ordenar por gravidade.
 */
const STATUS_SCORE: Record<HealthStatus, number> = {
  GREEN: 100,
  YELLOW: 60,
  RED: 25,
  BANNED: 0,
  LOST: 0,
  UNKNOWN: 0,
};

export function scoreForStatus(status: HealthStatus): number {
  return STATUS_SCORE[status];
}

const STALE_AFTER_HOURS = 72;

/** Sem check há mais de 72h: o worker marca como UNKNOWN. */
export function isStale(lastCheckAt: Date | null, now: Date = new Date()): boolean {
  if (!lastCheckAt) return true;
  const hours = (now.getTime() - lastCheckAt.getTime()) / (1000 * 60 * 60);
  return hours > STALE_AFTER_HOURS;
}
