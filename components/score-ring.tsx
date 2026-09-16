const COLORS: Record<string, string> = {
  GREEN: "#22c55e",
  YELLOW: "#f59e0b",
  RED: "#ef4444",
  BANNED: "#ef4444",
  LOST: "#64748b",
  UNKNOWN: "#64748b",
};

export function ScoreRing({
  score,
  status,
  size = 44,
}: {
  score: number;
  status: string;
  size?: number;
}) {
  const color = COLORS[status] ?? COLORS.UNKNOWN;
  const fraction = Math.max(0, Math.min(100, score)) / 100;
  const center = size / 2;
  const radius = center - 4;
  const circumference = 2 * Math.PI * radius;
  const dash = `${(circumference * fraction).toFixed(1)} ${circumference.toFixed(1)}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={dash}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x={center}
        y={center + 4}
        textAnchor="middle"
        fontSize={size >= 60 ? 16 : 12}
        fontFamily="var(--font-fira-code), monospace"
        fontWeight="600"
        fill="var(--foreground)"
      >
        {score}
      </text>
    </svg>
  );
}
