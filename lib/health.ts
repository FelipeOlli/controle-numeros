import type { HealthStatus } from "@/generated/prisma/enums";

export type QualityRating = "GREEN" | "YELLOW" | "RED" | "UNKNOWN";

export interface HealthInput {
  /** Rating informado pelo provedor (Meta Cloud) ou pela observação manual. */
  qualityRating?: QualityRating | null;
  /** Quantos avisos/restrições o número recebeu desde o último check. */
  warningsCount?: number | null;
  /** Incidentes (mudanças de status para pior) abertos nos últimos 30 dias. */
  openIncidentsLast30d?: number;
  /** Data do último check anterior a este; null se nunca houve. */
  lastCheckAt?: Date | null;
  /** Agora, para calcular staleness. Default: new Date(). */
  now?: Date;
  /** Número tem menos de 14 dias de operação. */
  isNewNumber?: boolean;
  /** Volume diário está acima do limite recomendado para número novo. */
  highVolume?: boolean;
  /** Marcação manual de banimento — estado terminal, ignora o resto. */
  banned?: boolean;
}

export interface HealthResult {
  score: number;
  status: HealthStatus;
}

const STALE_AFTER_HOURS = 72;

export function computeHealth(input: HealthInput): HealthResult {
  if (input.banned) {
    return { score: 0, status: "BANNED" };
  }

  const now = input.now ?? new Date();
  const staleHours = input.lastCheckAt
    ? (now.getTime() - input.lastCheckAt.getTime()) / (1000 * 60 * 60)
    : Infinity;

  if (staleHours > STALE_AFTER_HOURS) {
    return { score: 0, status: "UNKNOWN" };
  }

  let score = 100;

  switch (input.qualityRating) {
    case "YELLOW":
      score -= 20;
      break;
    case "RED":
      score -= 45;
      break;
    case "UNKNOWN":
      score -= 10;
      break;
    default:
      break;
  }

  const warnings = input.warningsCount ?? 0;
  score -= Math.min(warnings, 5) * 8;

  const incidents = input.openIncidentsLast30d ?? 0;
  score -= Math.min(incidents, 5) * 6;

  if (input.isNewNumber && input.highVolume) {
    score -= 15;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const status: HealthStatus = score >= 80 ? "GREEN" : score >= 50 ? "YELLOW" : "RED";

  return { score, status };
}
