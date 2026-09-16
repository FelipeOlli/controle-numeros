import { CheckCircle2, AlertTriangle, XCircle, Ban, CircleDashed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const COLORS: Record<string, string> = {
  GREEN: "bg-primary/15 text-primary border-primary/30",
  YELLOW: "bg-warning/15 text-warning border-warning/30",
  RED: "bg-destructive/15 text-destructive border-destructive/30",
  BANNED: "bg-muted text-muted-foreground border-border",
  UNKNOWN: "bg-muted text-muted-foreground border-border",
};

const ICONS: Record<string, LucideIcon> = {
  GREEN: CheckCircle2,
  YELLOW: AlertTriangle,
  RED: XCircle,
  BANNED: Ban,
  UNKNOWN: CircleDashed,
};

const LABELS: Record<string, string> = {
  GREEN: "Saudável",
  YELLOW: "Atenção",
  RED: "Crítico",
  BANNED: "Banido",
  UNKNOWN: "Sem dados",
};

export function StatusBadge({ status }: { status: string }) {
  const Icon = ICONS[status] ?? ICONS.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? COLORS.UNKNOWN}`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {LABELS[status] ?? status}
    </span>
  );
}
