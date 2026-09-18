"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TriangleAlert, CircleAlert, CircleDashed } from "lucide-react";
import { ORIGIN_LABELS, PLATFORM_LABELS } from "@/lib/providers";
import { timeAgo } from "@/lib/format";
import { StatusPill } from "@/components/status-pill";
import type { NumberOrigin, NumberPlatform } from "@/generated/prisma/enums";

export type AttentionItem = {
  id: string;
  orgSlug: string;
  orgName: string;
  label: string;
  e164: string;
  origin: NumberOrigin;
  platforms: NumberPlatform[];
  status: "YELLOW" | "RED" | "BANNED" | "LOST" | "UNKNOWN";
  reason: string;
  lastCheckAt: Date | null;
};

const FILTERS: { key: string; label: string; statuses: AttentionItem["status"][] }[] = [
  { key: "todos", label: "Todos", statuses: [] },
  { key: "banidos", label: "Banidos", statuses: ["BANNED"] },
  { key: "criticos", label: "Críticos", statuses: ["RED"] },
  { key: "atencao", label: "Atenção", statuses: ["YELLOW"] },
  { key: "sem-dados", label: "Sem dados", statuses: ["LOST", "UNKNOWN"] },
];

function QueueIcon({ status }: { status: AttentionItem["status"] }) {
  if (status === "RED" || status === "BANNED") {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger-deep">
        <TriangleAlert size={18} strokeWidth={2} />
      </span>
    );
  }
  if (status === "YELLOW") {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn-icon">
        <CircleAlert size={18} strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-row text-ink-2">
      <CircleDashed size={18} strokeWidth={2} />
    </span>
  );
}

export function AttentionQueue({ items }: { items: AttentionItem[] }) {
  const [filter, setFilter] = useState("todos");

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filtered = useMemo(
    () => (active.statuses.length ? items.filter((i) => active.statuses.includes(i.status)) : items),
    [items, active],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const count = f.statuses.length
            ? items.filter((i) => f.statuses.includes(i.status)).length
            : items.length;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                f.key === filter
                  ? "shrink-0 rounded-full bg-pill-active px-4 py-2 text-[13px] font-semibold text-pill-active-ink min-[900px]:py-2"
                  : "shrink-0 rounded-full px-4 py-2 text-[13px] text-ink-2 transition hover:bg-pill-hover hover:text-ink"
              }
            >
              {f.label}
              {f.key !== "todos" ? ` · ${count}` : ""}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="type-body-sm py-6 text-center text-ink-3">Nenhum número nesse filtro.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-3.5 rounded-[18px] bg-row px-[18px] py-4"
            >
              <QueueIcon status={item.status} />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="type-item-name truncate">{item.label}</span>
                  <span className="truncate font-mono text-xs text-ink-3">{item.e164}</span>
                </div>
                <p className="type-body-sm mt-0.5 text-ink-2">{item.reason}</p>
                <p className="type-meta mt-1.5 text-ink-3">
                  {item.orgName} · {ORIGIN_LABELS[item.origin]}
                  {item.platforms.length > 0
                    ? ` (${item.platforms.map((p) => PLATFORM_LABELS[p]).join(", ")})`
                    : ""}{" "}
                  · {item.lastCheckAt ? timeAgo(item.lastCheckAt) : "sem check"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusPill status={item.status} />
                <Link
                  href={`/${item.orgSlug}/numeros/${item.id}`}
                  className="text-[12px] font-semibold text-accent-link hover:text-ink"
                >
                  Ver histórico
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
