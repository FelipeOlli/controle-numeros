/** "há 2 h", "há 9 d" — meta de linhas da fila de atenção e listas de check. */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const minutes = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 60000));
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}
