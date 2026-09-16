import Link from "next/link";
import { Inbox } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { StatusBadge } from "@/components/status-badge";
import { ScoreRing } from "@/components/score-ring";
import { StatusSummary } from "@/components/status-summary";
import { PROVIDER_LABELS } from "@/lib/providers";
import { AddNumberDialog } from "./add-number-dialog";

export default async function NumerosPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const { org, role } = await requireOrg(orgSlug);

  const rawNumbers = await prisma.phoneNumber.findMany({
    where: { orgId: org.id },
    orderBy: { label: "asc" },
  });

  // Enum não tem ordem semântica no banco; ordena por gravidade na aplicação.
  const severity: Record<string, number> = {
    BANNED: 0,
    RED: 1,
    UNKNOWN: 2,
    YELLOW: 3,
    GREEN: 4,
  };
  const numbers = [...rawNumbers].sort(
    (a, b) => severity[a.currentStatus] - severity[b.currentStatus],
  );

  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Números</h1>
          <p className="text-sm text-muted-foreground">
            {numbers.length} número{numbers.length === 1 ? "" : "s"} monitorado
            {numbers.length === 1 ? "" : "s"}
          </p>
        </div>
        {canManage && <AddNumberDialog orgSlug={orgSlug} />}
      </div>

      <StatusSummary statuses={numbers.map((n) => n.currentStatus)} />

      {numbers.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-muted-foreground">
          <Inbox size={28} />
          <p className="text-sm">Nenhum número cadastrado ainda.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {numbers.map((n) => (
          <Link
            key={n.id}
            href={`/${orgSlug}/numeros/${n.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-foreground">{n.label}</div>
                <div className="font-mono text-sm text-muted-foreground">{n.e164}</div>
              </div>
              <ScoreRing score={n.currentScore} status={n.currentStatus} />
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
    </div>
  );
}
