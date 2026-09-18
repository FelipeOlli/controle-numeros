import type { HealthStatus } from "@/generated/prisma/enums";

const DOT_COLOR: Record<HealthStatus, string> = {
  GREEN: "var(--accent)",
  YELLOW: "var(--warn)",
  RED: "var(--danger)",
  BANNED: "var(--danger-deep)",
  LOST: "var(--neutral-dot)",
  UNKNOWN: "var(--neutral-dot)",
};

export type HealthPoint = { date: string; score: number; status: HealthStatus };

const Y_LEVELS = [100, 75, 50, 25, 0];

/** Linha de score no tempo — tela 3c. SVG estático, sem client JS. */
export function HealthChart({ data }: { data: HealthPoint[] }) {
  if (data.length < 2) return null;

  const width = 640;
  const height = 170;
  const marginLeft = 32;
  const marginTop = 10;
  const marginBottom = 22;
  const plotWidth = width - marginLeft;
  const plotHeight = height - marginTop - marginBottom;

  const x = (i: number) => marginLeft + (i / (data.length - 1)) * plotWidth;
  const y = (score: number) => marginTop + (1 - Math.max(0, Math.min(100, score)) / 100) * plotHeight;

  const linePoints = data.map((d, i) => `${x(i)},${y(d.score)}`).join(" ");

  const labelCount = Math.min(5, data.length);
  const labelIndexes = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1 || 1)) * (data.length - 1)),
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-[120px] w-full min-[900px]:h-[160px]"
    >
      {Y_LEVELS.map((level) => (
        <g key={level}>
          <line
            x1={marginLeft}
            x2={width}
            y1={y(level)}
            y2={y(level)}
            stroke="var(--line-2)"
            strokeWidth={1}
          />
          <text
            x={0}
            y={y(level) + 3}
            fontSize={10}
            fill="var(--ink-3)"
            fontFamily="var(--font-fira-code), monospace"
          >
            {level}
          </text>
        </g>
      ))}

      <polyline points={linePoints} fill="none" stroke="var(--accent)" strokeWidth={2.6} />

      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.score)} r={3.5} fill={DOT_COLOR[d.status]} />
      ))}

      {labelIndexes.map((i) => (
        <text
          key={i}
          x={x(i)}
          y={height - 4}
          textAnchor="middle"
          fontSize={10}
          fill="var(--ink-3)"
          fontFamily="var(--font-fira-code), monospace"
        >
          {new Date(data[i].date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
        </text>
      ))}
    </svg>
  );
}
