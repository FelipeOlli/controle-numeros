"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function HealthChart({ data }: { data: { date: string; score: number }[] }) {
  return (
    <div className="h-48 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR")}
            stroke="#525252"
            fontSize={12}
          />
          <YAxis domain={[0, 100]} stroke="#525252" fontSize={12} />
          <Tooltip
            labelFormatter={(v) => new Date(v as string).toLocaleString("pt-BR")}
            contentStyle={{ background: "#171717", border: "1px solid #404040" }}
          />
          <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
