import type { NumberOrigin, NumberPlatform } from "@/generated/prisma/enums";

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

/**
 * Origem decide o vínculo em dois casos: Iungo já vem operacional (sem
 * vínculo) e Meta oficial só roda via Meta Cloud API. Fora isso, o vínculo é
 * livre (um número pode estar em mais de uma plataforma ao mesmo tempo).
 */
export function resolvePlatforms(
  origin: NumberOrigin,
  submitted: NumberPlatform[],
): NumberPlatform[] {
  if (origin === "IUNGO") return [];
  if (origin === "META_OFICIAL") return ["META_CLOUD"];
  return submitted;
}
