import Link from "next/link";
import { Inbox } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { ScoreRing } from "@/components/score-ring";
import { StatusPill } from "@/components/status-pill";
import { ORIGIN_LABELS, PLATFORM_LABELS, CHIP_PLAN_LABELS, tracksRecharge } from "@/lib/providers";
import { dueDateStatus } from "@/lib/format";
import { AddNumberDialog } from "./add-number-dialog";
import { ZapiCredentialForm } from "./zapi-credential-form";
import type { HealthStatus } from "@/generated/prisma/enums";

const SEVERITY: Record<HealthStatus, number> = {
  BANNED: 0,
  RED: 1,
  LOST: 2,
  UNKNOWN: 2,
  YELLOW: 3,
  GREEN: 4,
};

const KPIS: { statuses: HealthStatus[]; label: string; dot: string }[] = [
  { statuses: ["GREEN"], label: "Saudáveis", dot: "bg-accent" },
  { statuses: ["YELLOW"], label: "Em atenção", dot: "bg-warn" },
  { statuses: ["RED"], label: "Críticos", dot: "bg-danger" },
  { statuses: ["BANNED", "LOST"], label: "Banidos", dot: "bg-neutral-dot" },
  { statuses: ["UNKNOWN"], label: "Sem dados", dot: "bg-neutral-dot" },
];

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

  const numbers = [...rawNumbers].sort(
    (a, b) => SEVERITY[a.currentStatus] - SEVERITY[b.currentStatus],
  );

  const canManage = role === "OWNER" || role === "ADMIN";

  const zapiCredential = canManage
    ? await prisma.providerCredential.findUnique({
        where: { orgId_platform: { orgId: org.id, platform: "ZAPI" } },
      })
    : null;

  return (
    <div className="flex flex-col gap-5 py-1">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="type-page-title">Números</h1>
          <p className="type-body-sm text-ink-3">
            {numbers.length} número{numbers.length === 1 ? "" : "s"} monitorado
            {numbers.length === 1 ? "" : "s"}
          </p>
        </div>
        {canManage && <AddNumberDialog orgSlug={orgSlug} />}
      </div>

      <div className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-5">
        {KPIS.map((kpi) => {
          const count = numbers.filter((n) => kpi.statuses.includes(n.currentStatus)).length;
          return (
            <div key={kpi.label} className="flex flex-col gap-2 rounded-[18px] bg-surface p-4">
              <span className="flex items-center gap-1.5 text-xs text-ink-3">
                <span className={`h-[7px] w-[7px] rounded-sm ${kpi.dot}`} />
                {kpi.label}
              </span>
              <span className="type-kpi-md">{count}</span>
            </div>
          );
        })}
      </div>

      {canManage && <ZapiCredentialForm orgSlug={orgSlug} configured={Boolean(zapiCredential)} />}

      {numbers.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-line-dashed bg-surface py-16 text-ink-3">
          <Inbox size={28} />
          <p className="text-sm">Nenhum número cadastrado ainda.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {numbers.map((n) => (
          <Link
            key={n.id}
            href={`/${orgSlug}/numeros/${n.id}`}
            className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px] transition hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="type-card-title-sm">{n.label}</div>
                <div className="font-mono text-sm text-ink-3">{n.e164}</div>
              </div>
              <ScoreRing score={n.currentScore} status={n.currentStatus} />
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
                {tracksRecharge(n.origin, n.chipPlan) && n.nextRechargeAt && (() => {
                  const { colorClass, label } = dueDateStatus(n.nextRechargeAt);
                  return (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
                      Recarga: {label}
                    </span>
                  );
                })()}
                {n.origin === "CHIP_FISICO" && n.chipPlan === "POS_PAGO" && (
                  <span className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">
                    {CHIP_PLAN_LABELS.POS_PAGO}
                  </span>
                )}
              </div>
              <StatusPill status={n.currentStatus} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
