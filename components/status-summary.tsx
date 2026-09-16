import { CheckCircle2, AlertTriangle, XCircle, Unplug, CircleDashed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CARDS: {
  statuses: string[];
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
  {
    statuses: ["GREEN"],
    label: "Saudáveis",
    icon: CheckCircle2,
    color: "var(--primary)",
    bg: "color-mix(in srgb, var(--primary) 15%, transparent)",
  },
  {
    statuses: ["YELLOW"],
    label: "Em atenção",
    icon: AlertTriangle,
    color: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 15%, transparent)",
  },
  {
    statuses: ["RED"],
    label: "Críticos",
    icon: XCircle,
    color: "var(--destructive)",
    bg: "color-mix(in srgb, var(--destructive) 15%, transparent)",
  },
  {
    statuses: ["BANNED", "LOST"],
    label: "Banidos/perdidos",
    icon: Unplug,
    color: "var(--muted-foreground)",
    bg: "var(--muted)",
  },
  {
    statuses: ["UNKNOWN"],
    label: "Sem dados",
    icon: CircleDashed,
    color: "var(--muted-foreground)",
    bg: "var(--muted)",
  },
];

export function StatusSummary({ statuses }: { statuses: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((card) => {
        const count = statuses.filter((s) => card.statuses.includes(s)).length;
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: card.bg, color: card.color }}
              >
                <Icon size={14} />
              </span>
            </div>
            <span className="font-mono text-2xl font-bold">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
