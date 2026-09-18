import Link from "next/link";
import { Inbox, LayoutGrid, Rows3, Building2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ScoreRing } from "@/components/score-ring";
import { StatusPill } from "@/components/status-pill";
import { ORIGIN_LABELS, PLATFORM_LABELS } from "@/lib/providers";
import type { HealthStatus, NumberOrigin, NumberPlatform } from "@/generated/prisma/enums";

const SEVERITY: Record<HealthStatus, number> = {
  BANNED: 0,
  RED: 1,
  LOST: 2,
  UNKNOWN: 2,
  YELLOW: 3,
  GREEN: 4,
};

export default async function NumerosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; agrupar?: string }>;
}) {
  const { empresa, agrupar } = await searchParams;
  const session = await auth();
  const memberships = session!.memberships;

  const activeMemberships = empresa ? memberships.filter((m) => m.orgSlug === empresa) : memberships;
  const orgIds = activeMemberships.map((m) => m.orgId);
  const orgNameById = new Map(memberships.map((m) => [m.orgId, m.orgName]));
  const orgSlugById = new Map(memberships.map((m) => [m.orgId, m.orgSlug]));

  const rawNumbers = orgIds.length
    ? await prisma.phoneNumber.findMany({
        where: { orgId: { in: orgIds } },
        orderBy: { label: "asc" },
      })
    : [];

  const numbers = [...rawNumbers].sort(
    (a, b) => SEVERITY[a.currentStatus] - SEVERITY[b.currentStatus],
  );

  const grouped = agrupar === "1";

  const groups = grouped
    ? Array.from(
        numbers.reduce((acc, n) => {
          const list = acc.get(n.orgId) ?? [];
          list.push(n);
          acc.set(n.orgId, list);
          return acc;
        }, new Map<string, typeof numbers>()),
      )
    : null;

  return (
    <div className="flex flex-col gap-5 py-1">
      <div>
        <h1 className="type-page-title">Números</h1>
        <p className="type-body-sm text-ink-3">
          {numbers.length} número{numbers.length === 1 ? "" : "s"} em{" "}
          {activeMemberships.length} empresa{activeMemberships.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto px-1">
          <Link
            href="/numeros"
            className={
              !empresa
                ? "shrink-0 rounded-full bg-pill-active px-4 py-2 text-[13px] font-semibold text-pill-active-ink"
                : "shrink-0 rounded-full px-4 py-2 text-[13px] text-ink-2 transition hover:bg-pill-hover hover:text-ink"
            }
          >
            Todas as empresas
          </Link>
          {memberships.map((m) => (
            <Link
              key={m.orgId}
              href={`/numeros?empresa=${m.orgSlug}${grouped ? "&agrupar=1" : ""}`}
              className={
                empresa === m.orgSlug
                  ? "shrink-0 rounded-full bg-pill-active px-4 py-2 text-[13px] font-semibold text-pill-active-ink"
                  : "shrink-0 rounded-full px-4 py-2 text-[13px] text-ink-2 transition hover:bg-pill-hover hover:text-ink"
              }
            >
              {m.orgName}
            </Link>
          ))}
        </div>

        <Link
          href={`/numeros?${empresa ? `empresa=${empresa}&` : ""}${grouped ? "" : "agrupar=1"}`}
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-2 transition hover:text-ink"
        >
          {grouped ? <LayoutGrid size={14} /> : <Rows3 size={14} />}
          {grouped ? "Ver em grade única" : "Agrupar por empresa"}
        </Link>
      </div>

      {numbers.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-line-dashed bg-surface py-16 text-ink-3">
          <Inbox size={28} />
          <p className="text-sm">Nenhum número encontrado.</p>
        </div>
      )}

      {!grouped && numbers.length > 0 && (
        <NumberGrid numbers={numbers} orgSlugById={orgSlugById} orgNameById={orgNameById} />
      )}

      {grouped &&
        groups?.map(([orgId, group]) => (
          <section key={orgId} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Building2 size={15} className="text-accent" />
              {orgNameById.get(orgId)}
              <span className="font-normal text-ink-3">
                · {group.length} número{group.length === 1 ? "" : "s"}
              </span>
            </h2>
            <NumberGrid numbers={group} orgSlugById={orgSlugById} orgNameById={orgNameById} />
          </section>
        ))}
    </div>
  );
}

function NumberGrid({
  numbers,
  orgSlugById,
  orgNameById,
}: {
  numbers: {
    id: string;
    orgId: string;
    label: string;
    e164: string;
    origin: NumberOrigin;
    platforms: NumberPlatform[];
    currentStatus: string;
    currentScore: number;
  }[];
  orgSlugById: Map<string, string>;
  orgNameById: Map<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-3">
      {numbers.map((n) => (
        <Link
          key={n.id}
          href={`/${orgSlugById.get(n.orgId)}/numeros/${n.id}`}
          className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px] transition hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="type-card-title-sm">{n.label}</div>
              <div className="font-mono text-sm text-ink-3">{n.e164}</div>
            </div>
            <ScoreRing score={n.currentScore} status={n.currentStatus} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-3">
            <Building2 size={12} />
            {orgNameById.get(n.orgId)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-2 pt-3">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">
                {ORIGIN_LABELS[n.origin]}
              </span>
              {n.platforms.map((platform) => (
                <span key={platform} className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">
                  {PLATFORM_LABELS[platform]}
                </span>
              ))}
            </div>
            <StatusPill status={n.currentStatus} />
          </div>
        </Link>
      ))}
    </div>
  );
}
