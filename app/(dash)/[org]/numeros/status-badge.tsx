const COLORS: Record<string, string> = {
  GREEN: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  YELLOW: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  RED: "bg-red-500/15 text-red-400 border-red-500/30",
  BANNED: "bg-neutral-700/40 text-neutral-300 border-neutral-600",
  UNKNOWN: "bg-neutral-800 text-neutral-400 border-neutral-700",
};

const LABELS: Record<string, string> = {
  GREEN: "Saudável",
  YELLOW: "Atenção",
  RED: "Crítico",
  BANNED: "Banido",
  UNKNOWN: "Sem dados",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? COLORS.UNKNOWN}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
