import type { HealthStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/health";

const STYLES: Record<HealthStatus, { bg: string; text: string; dot: string }> = {
  GREEN: { bg: "var(--accent-soft)", text: "var(--accent-deep)", dot: "var(--accent)" },
  YELLOW: { bg: "var(--warn-soft)", text: "var(--warn-deep)", dot: "var(--warn)" },
  RED: { bg: "var(--danger)", text: "var(--danger-ink)", dot: "var(--danger)" },
  BANNED: { bg: "var(--danger)", text: "var(--danger-ink)", dot: "var(--danger-deep)" },
  LOST: { bg: "var(--row)", text: "var(--ink-2)", dot: "var(--neutral-dot)" },
  UNKNOWN: { bg: "var(--row)", text: "var(--ink-2)", dot: "var(--neutral-dot)" },
};

export function StatusPill({ status }: { status: HealthStatus | string }) {
  const style = STYLES[status as HealthStatus] ?? STYLES.UNKNOWN;
  const label = STATUS_LABELS[status as HealthStatus] ?? status;

  return (
    <span
      className="type-pill inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1"
      style={{ background: style.bg, color: style.text }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: style.dot }} />
      {label}
    </span>
  );
}

export function StatusDot({ status, size = 8 }: { status: HealthStatus | string; size?: number }) {
  const style = STYLES[status as HealthStatus] ?? STYLES.UNKNOWN;
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: style.dot }}
    />
  );
}
