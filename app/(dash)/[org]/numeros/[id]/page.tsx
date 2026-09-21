import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardCheck, ShieldAlert, History, BatteryCharging } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireOrg } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { SELECTABLE_STATUSES, STATUS_LABELS } from "@/lib/health";
import { ORIGIN_LABELS, PLATFORM_LABELS, CHIP_PLAN_LABELS, tracksRecharge } from "@/lib/providers";
import { dueDateStatus } from "@/lib/format";
import { createCheck } from "./actions";
import type { ChipPlan } from "@/generated/prisma/enums";
import { HealthChart } from "./health-chart";
import { DeleteNumberButton } from "./delete-number-button";
import { EditNumberDialog } from "./edit-number-dialog";
import { ZapiBillingForm } from "./zapi-billing-form";
import { RechargeForm } from "./recharge-form";

const selectClass =
  "w-full rounded-[14px] border border-line bg-canvas px-[14px] py-3 text-[15px] text-ink outline-none focus:border-accent focus:bg-surface";

export default async function NumberDetailPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org: orgSlug, id } = await params;
  const { org, role } = await requireOrg(orgSlug);
  const canManage = role === "OWNER" || role === "ADMIN";

  const session = await auth();
  const movableOrgs = (session?.memberships ?? [])
    .filter((m) => m.orgSlug !== orgSlug && (m.role === "OWNER" || m.role === "ADMIN"))
    .map((m) => ({ slug: m.orgSlug, name: m.orgName }));

  const number = await prisma.phoneNumber.findUnique({ where: { id } });
  if (!number || number.orgId !== org.id) {
    notFound();
  }

  const [checks, incidents, chipLogs] = await Promise.all([
    prisma.healthCheck.findMany({
      where: { phoneNumberId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.incident.findMany({
      where: { phoneNumberId: id },
      orderBy: { openedAt: "desc" },
      take: 10,
    }),
    prisma.alertLog.findMany({
      where: {
        phoneNumberId: id,
        OR: [
          { payload: { path: ["event"], equals: "chip_plan_changed" } },
          { payload: { path: ["event"], equals: "chip_notes_changed" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  type HistoryEntry =
    | { kind: "check"; createdAt: Date; check: (typeof checks)[number] }
    | { kind: "chipPlanChange"; createdAt: Date; from: string | null; to: string }
    | { kind: "chipNotesChange"; createdAt: Date; from: string | null; to: string | null };

  const historyEntries: HistoryEntry[] = [
    ...checks.map((c) => ({ kind: "check" as const, createdAt: c.createdAt, check: c })),
    ...chipLogs.map((l) => {
      const payload = l.payload as { event: string; from: string | null; to: string | null };
      if (payload.event === "chip_plan_changed") {
        return {
          kind: "chipPlanChange" as const,
          createdAt: l.createdAt,
          from: payload.from,
          to: payload.to as string,
        };
      }
      return { kind: "chipNotesChange" as const, createdAt: l.createdAt, from: payload.from, to: payload.to };
    }),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const chartData = [...checks]
    .reverse()
    .map((c) => ({ date: c.createdAt.toISOString(), score: c.score, status: c.status }));

  const isZapi = number.platforms.includes("ZAPI");

  const isChipFisico = number.origin === "CHIP_FISICO";

  let billingPill: ReactNode = null;
  if (isZapi && number.providerDueAt) {
    const { colorClass, label } = dueDateStatus(number.providerDueAt);
    billingPill = (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
        {label}
        {number.providerPaymentStatus ? ` · ${number.providerPaymentStatus}` : ""}
      </span>
    );
  }

  const isPostpaidChip = isChipFisico && number.chipPlan === "POS_PAGO";

  let rechargePill: ReactNode = null;
  if (tracksRecharge(number.origin, number.chipPlan) && number.nextRechargeAt) {
    const { colorClass, label } = dueDateStatus(number.nextRechargeAt);
    rechargePill = (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
        Recarga: {label}
      </span>
    );
  } else if (isPostpaidChip) {
    rechargePill = (
      <span className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">
        {CHIP_PLAN_LABELS.POS_PAGO}
      </span>
    );
  }

  const identityCard = (
    <div className="flex flex-col gap-4 rounded-[22px] bg-surface p-[22px_24px] min-[600px]:flex-row min-[600px]:items-start min-[600px]:justify-between">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.03em]">{number.label}</h1>
        <p className="font-mono text-[15px] text-ink-3">{number.e164}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">
            {ORIGIN_LABELS[number.origin]}
          </span>
          {number.platforms.map((platform) => (
            <span key={platform} className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">
              {PLATFORM_LABELS[platform]}
            </span>
          ))}
          <span className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">{org.name}</span>
          {billingPill}
          {rechargePill}
        </div>
      </div>
      <div className="flex flex-col items-start gap-1.5 min-[600px]:items-end">
        <StatusPill status={number.currentStatus} />
        <span className="type-meta text-ink-3">
          desde {(number.lastCheckAt ?? number.updatedAt).toLocaleString("pt-BR")}
        </span>
        {isZapi && (
          <span className="type-meta text-ink-3">
            Z-API sincronizado{" "}
            {number.lastSyncAt ? number.lastSyncAt.toLocaleString("pt-BR") : "nunca"}
          </span>
        )}
      </div>
    </div>
  );

  const scoreHistoryCard = chartData.length > 1 && (
    <div className="flex flex-col gap-4 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="type-card-title-sm">Histórico de score</span>
      <HealthChart data={chartData} />
    </div>
  );

  const checksHistoryCard = (
    <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="flex items-center gap-2 type-card-title-sm">
        <History size={16} className="text-accent" />
        Histórico de checks
      </span>
      {historyEntries.length === 0 ? (
        <p className="type-body-sm text-ink-3">Nenhum check registrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {historyEntries.map((entry) => {
            if (entry.kind === "check") {
              return (
                <div
                  key={entry.check.id}
                  className="grid grid-cols-1 gap-1.5 rounded-[15px] bg-row px-4 py-3 min-[900px]:grid-cols-[150px_78px_1fr_auto] min-[900px]:items-center min-[900px]:gap-3"
                >
                  <StatusPill status={entry.check.status} />
                  <span className="font-mono text-xs text-ink-3">score {entry.check.score}</span>
                  <span className="type-body-sm truncate text-ink-2">{entry.check.observation || "—"}</span>
                  <span className="type-meta whitespace-nowrap text-ink-3">
                    {entry.check.createdAt.toLocaleString("pt-BR")} ·{" "}
                    {entry.check.source === "API" ? "automático" : "manual"}
                  </span>
                </div>
              );
            }

            if (entry.kind === "chipPlanChange") {
              return (
                <div
                  key={`plan-${entry.createdAt.getTime()}`}
                  className="grid grid-cols-1 gap-1.5 rounded-[15px] bg-row px-4 py-3 min-[900px]:grid-cols-[150px_78px_1fr_auto] min-[900px]:items-center min-[900px]:gap-3"
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                    <BatteryCharging size={13} className="text-accent" />
                    Plano
                  </span>
                  <span />
                  <span className="type-body-sm truncate text-ink-2">
                    {CHIP_PLAN_LABELS[entry.from as ChipPlan] ?? "—"} →{" "}
                    {CHIP_PLAN_LABELS[entry.to as ChipPlan] ?? entry.to}
                  </span>
                  <span className="type-meta whitespace-nowrap text-ink-3">
                    {entry.createdAt.toLocaleString("pt-BR")}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={`notes-${entry.createdAt.getTime()}`}
                className="grid grid-cols-1 gap-1.5 rounded-[15px] bg-row px-4 py-3 min-[900px]:grid-cols-[150px_78px_1fr_auto] min-[900px]:items-center min-[900px]:gap-3"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                  <History size={13} className="text-accent" />
                  Observações
                </span>
                <span />
                <span className="type-body-sm truncate text-ink-2">{entry.to || "removidas"}</span>
                <span className="type-meta whitespace-nowrap text-ink-3">
                  {entry.createdAt.toLocaleString("pt-BR")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const registerCheckCard = (
    <div className="flex flex-col gap-4 rounded-[22px] bg-accent p-6">
      <span className="flex items-center gap-2 text-[19px] font-bold tracking-[-0.02em] text-accent-ink">
        <ClipboardCheck size={18} />
        Registrar status
      </span>
      <form
        action={createCheck.bind(null, orgSlug, id)}
        className="flex flex-col gap-3"
      >
        <select name="status" required defaultValue="" className={selectClass}>
          <option value="" disabled>
            Selecione o estado atual
          </option>
          {SELECTABLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <input
          name="observation"
          placeholder="Observação (opcional)"
          className={selectClass}
        />
        <Button
          type="submit"
          className="mt-1 rounded-full bg-pill-active py-3 text-[15px] font-bold text-pill-active-ink hover:bg-black/80"
        >
          Salvar check
        </Button>
        <p className="text-[11px] leading-snug text-accent-ink/80">
          Se for uma piora, um incidente é aberto e os canais ativos disparam na hora.
        </p>
      </form>
    </div>
  );

  const incidentsCard = (
    <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="flex items-center gap-2 type-card-title-sm">
        <ShieldAlert size={16} className="text-accent" />
        Incidentes
      </span>
      {incidents.length === 0 ? (
        <p className="type-body-sm text-ink-3">Nenhum incidente registrado.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line-2">
          {incidents.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="flex items-center gap-1.5">
                {STATUS_LABELS[i.fromStatus]}
                <ArrowRight size={13} className="text-ink-3" />
                {STATUS_LABELS[i.toStatus]}
              </span>
              <span className="font-mono text-xs text-ink-3">
                {i.openedAt.toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const billingCard = isZapi && canManage && (
    <ZapiBillingForm
      orgSlug={orgSlug}
      numberId={id}
      providerDueAt={number.providerDueAt}
      providerPaymentStatus={number.providerPaymentStatus}
    />
  );

  const rechargeCard = isChipFisico && canManage && (
    <RechargeForm
      orgSlug={orgSlug}
      numberId={id}
      chipPlan={number.chipPlan}
      carrier={number.carrier}
      lastRechargeAt={number.lastRechargeAt}
      nextRechargeAt={number.nextRechargeAt}
      notes={number.notes}
    />
  );

  return (
    <div className="flex flex-col gap-4 py-1">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/${orgSlug}/numeros`}
          className="flex w-fit items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:text-ink"
        >
          <ArrowLeft size={15} />
          {org.name}
        </Link>
        {canManage && (
          <div className="flex items-center gap-1.5">
            <EditNumberDialog
              orgSlug={orgSlug}
              numberId={id}
              label={number.label}
              e164={number.e164}
              origin={number.origin}
              platforms={number.platforms}
              externalId={number.externalId}
              providerToken={number.providerToken}
              movableOrgs={movableOrgs}
            />
            <DeleteNumberButton orgSlug={orgSlug} numberId={id} label={number.label} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 min-[900px]:hidden">
        {identityCard}
        {registerCheckCard}
        {billingCard}
        {rechargeCard}
        {scoreHistoryCard}
        {incidentsCard}
        {checksHistoryCard}
      </div>

      <div className="hidden min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_340px] min-[900px]:items-start min-[900px]:gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          {identityCard}
          {scoreHistoryCard}
          {checksHistoryCard}
        </div>
        <div className="flex flex-col gap-4">
          {registerCheckCard}
          {billingCard}
          {rechargeCard}
          {incidentsCard}
        </div>
      </div>
    </div>
  );
}
