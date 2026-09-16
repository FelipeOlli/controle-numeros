import Link from "next/link";
import { Inbox, LayoutGrid, Rows3, Building2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { ScoreRing } from "@/components/score-ring";
import { StatusSummary } from "@/components/status-summary";
import { PROVIDER_LABELS } from "@/lib/providers";

const severity: Record<string, number> = {
  BANNED: 0,
  RED: 1,
  UNKNOWN: 2,
  YELLOW: 3,
  GREEN: 4,
};

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; agrupar?: string }>;
}) {
  const { empresa, agrupar } = await searchParams;
  const session = await auth();
  const memberships = session!.memberships;

  const activeMemberships = empresa
    ? memberships.filter((m) => m.orgSlug === empresa)
    : memberships;
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
    (a, b) => severity[a.currentStatus] - severity[b.currentStatus],
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Números</h1>
        <p className="text-sm text-muted-foreground">
          {numbers.length} número{numbers.length === 1 ? "" : "s"} em{" "}
          {activeMemberships.length} empresa{activeMemberships.length === 1 ? "" : "s"}
        </p>
      </div>

      <StatusSummary statuses={numbers.map((n) => n.currentStatus)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/painel"
            className={
              !empresa
                ? "rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                : "rounded-full px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            }
          >
            Todas as empresas
          </Link>
          {memberships.map((m) => (
            <Link
              key={m.orgId}
              href={`/painel?empresa=${m.orgSlug}${grouped ? "&agrupar=1" : ""}`}
              className={
                empresa === m.orgSlug
                  ? "rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                  : "rounded-full px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
              }
            >
              {m.orgName}
            </Link>
          ))}
        </div>

        <Link
          href={`/painel?${empresa ? `empresa=${empresa}&` : ""}${grouped ? "" : "agrupar=1"}`}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          {grouped ? <LayoutGrid size={14} /> : <Rows3 size={14} />}
          {grouped ? "Ver em grade única" : "Agrupar por empresa"}
        </Link>
      </div>

      {numbers.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-muted-foreground">
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
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Building2 size={15} className="text-primary" />
              {orgNameById.get(orgId)}
              <span className="text-muted-foreground">
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
    provider: string;
    currentStatus: string;
    currentScore: number;
  }[];
  orgSlugById: Map<string, string>;
  orgNameById: Map<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {numbers.map((n) => (
        <Link
          key={n.id}
          href={`/${orgSlugById.get(n.orgId)}/numeros/${n.id}`}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium text-foreground">{n.label}</div>
              <div className="font-mono text-sm text-muted-foreground">{n.e164}</div>
            </div>
            <ScoreRing score={n.currentScore} status={n.currentStatus} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 size={12} />
            {orgNameById.get(n.orgId)}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5">
              {PROVIDER_LABELS[n.provider] ?? n.provider}
            </span>
            <StatusBadge status={n.currentStatus} />
          </div>
        </Link>
      ))}
    </div>
  );
}
