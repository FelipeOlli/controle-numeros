import type { NumberOrigin, NumberPlatform, Carrier, ChipPlan } from "@/generated/prisma/enums";

/** Como o número foi adquirido. */
export const ORIGIN_LABELS: Record<NumberOrigin, string> = {
  CHIP_FISICO: "Chip físico",
  META_OFICIAL: "Meta oficial",
  NUMERO_VIRTUAL: "Número virtual",
  IUNGO: "Iungo",
};

/** Em quais plataformas o número está vinculado pra operar (pode ser mais de uma). */
export const PLATFORM_LABELS: Record<NumberPlatform, string> = {
  WHATSAPP_NORMAL: "WhatsApp Normal",
  WHATSAPP_BUSINESS: "WhatsApp Business",
  ZAPI: "Z-API",
  EVOLUTION: "Evolution API",
  META_CLOUD: "Meta Cloud API",
};

/** Operadora do chip físico. */
export const CARRIER_LABELS: Record<Carrier, string> = {
  TIM: "TIM",
  VIVO: "Vivo",
  CLARO: "Claro",
  OI: "Oi",
  OUTRA: "Outra",
};

/** Plano do chip físico — pré-pago recarrega, conta/plano é faturado. */
export const CHIP_PLAN_LABELS: Record<ChipPlan, string> = {
  PRE_PAGO: "Pré-pago",
  POS_PAGO: "Conta/plano",
};

/** Sem crédito a cada ~3 meses, a operadora recolhe o chip físico. */
export const RECHARGE_INTERVAL_DAYS = 90;

/** Última recarga + intervalo padrão = próxima recarga prevista. */
export function computeNextRecharge(lastRechargeAt: Date): Date {
  const next = new Date(lastRechargeAt);
  next.setDate(next.getDate() + RECHARGE_INTERVAL_DAYS);
  return next;
}

/**
 * Só chip físico pré-pago recarrega — conta/plano é faturado e não usa os
 * campos de recarga. Única fonte da verdade dessa regra; usada na criação,
 * nas telas e no worker de lembretes.
 */
export function tracksRecharge(origin: NumberOrigin, chipPlan: ChipPlan | null): boolean {
  return origin === "CHIP_FISICO" && chipPlan !== "POS_PAGO";
}

/**
 * Só a origem Meta oficial força o vínculo (sempre Meta Cloud API). Todas as
 * outras origens — chip físico, número virtual e Iungo — têm as mesmas
 * opções de vínculo livres (um número pode estar em mais de uma plataforma
 * ao mesmo tempo).
 */
export function resolvePlatforms(
  origin: NumberOrigin,
  submitted: NumberPlatform[],
): NumberPlatform[] {
  if (origin === "META_OFICIAL") return ["META_CLOUD"];
  return submitted;
}
