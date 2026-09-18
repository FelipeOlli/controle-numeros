export type OrgHealthPoint = { orgId: string; name: string; pct: number };

function barColor(pct: number) {
  if (pct >= 80) return "var(--accent)";
  if (pct >= 50) return "var(--warn)";
  return "var(--danger)";
}

/** Radar SVG de N eixos (um por empresa) — tela 2a, some abaixo de 900px. */
export function OrgHealthRadar({ entries }: { entries: OrgHealthPoint[] }) {
  const n = entries.length;
  if (n < 3) return null;

  const cx = 120;
  const cy = 110;
  const maxR = 92;

  const point = (i: number, r: number) => {
    const angle = ((360 / n) * i * Math.PI) / 180;
    return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)] as const;
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPolygons = gridLevels.map((level) =>
    Array.from({ length: n }, (_, i) => point(i, maxR * level).join(",")).join(" "),
  );

  const dataPoints = entries.map((e, i) => point(i, (maxR * Math.max(0, Math.min(100, e.pct))) / 100));
  const dataPolygon = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg viewBox="0 0 240 220" width="100%" height="214" fill="none">
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} stroke="var(--line)" strokeWidth={1} />
      ))}
      {entries.map((_, i) => {
        const [x, y] = point(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} />;
      })}
      <polygon
        points={dataPolygon}
        fill="var(--accent)"
        fillOpacity={0.16}
        stroke="var(--accent)"
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.6} fill="var(--accent)" />
      ))}
      {entries.map((_, i) => {
        const [x, y] = point(i, maxR + 14);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--ink-3)"
            fontFamily="var(--font-fira-code), monospace"
          >
            {i + 1}
          </text>
        );
      })}
    </svg>
  );
}

/** Lista com barras — usada sempre no mobile e como corpo do card no desktop. */
export function OrgHealthList({ entries }: { entries: OrgHealthPoint[] }) {
  return (
    <div className="flex flex-col gap-[11px]">
      {entries.map((e, i) => (
        <div
          key={e.orgId}
          className="grid grid-cols-[14px_minmax(0,1fr)_76px_42px] items-center gap-2.5"
        >
          <span className="font-mono text-[11px] text-ink-3">{i + 1}</span>
          <span className="truncate text-[13px] font-medium">{e.name}</span>
          <span className="relative block h-[7px] overflow-hidden rounded-full bg-line">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, e.pct))}%`, background: barColor(e.pct) }}
            />
          </span>
          <span className="text-right text-[13px] font-bold">{e.pct}%</span>
        </div>
      ))}
    </div>
  );
}
