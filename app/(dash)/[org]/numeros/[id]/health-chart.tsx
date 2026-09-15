"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function HealthChart({ data }: { data: { date: string; score: number }[] }) {
  return (
    <div className="h-48 rounded-lg border border-border bg-card p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR")}
            stroke="#94a3b8"
            fontSize={12}
          />
          <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
          <Tooltip
            labelFormatter={(v) => new Date(v as string).toLocaleString("pt-BR")}
            contentStyle={{ background: "#1b2336", border: "1px solid #334155", borderRadius: 8 }}
          />
          <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
