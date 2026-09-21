const TIMEZONE = "America/Sao_Paulo";

/**
 * Data/hora completa no fuso do Brasil — o servidor roda fora do país (UTC),
 * então `toLocaleString` sem timeZone explícito mostra a hora do servidor,
 * não a de Brasília. Usar sempre isso (ou formatDate) em vez de chamar
 * toLocaleString/toLocaleDateString direto num Date.
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", { timeZone: TIMEZONE });
}

/** Só a data, no fuso do Brasil — ver formatDateTime. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: TIMEZONE });
}

/** "há 2 h", "há 9 d" — meta de linhas da fila de atenção e listas de check. */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const minutes = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 60000));
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

/**
 * Pílula de "vencimento" — usada pro vencimento Z-API e pra recarga de chip
 * físico. Mesmas faixas de cor do resto do app: ≤3 dias crítico, ≤10 dias
 * atenção, senão estável.
 */
export function dueDateStatus(
  date: Date,
  now: Date = new Date(),
): { daysUntil: number; colorClass: string; label: string } {
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const colorClass =
    daysUntil <= 3
      ? "bg-danger-soft text-danger-deep"
      : daysUntil <= 10
        ? "bg-warn-soft text-warn-deep"
        : "bg-accent-soft text-accent-deep";

  const label =
    daysUntil < 0
      ? `Vencido há ${Math.abs(daysUntil)} dia${Math.abs(daysUntil) === 1 ? "" : "s"}`
      : daysUntil === 0
        ? "Vence hoje"
        : `Vence em ${daysUntil} dia${daysUntil === 1 ? "" : "s"}`;

  return { daysUntil, colorClass, label };
}
