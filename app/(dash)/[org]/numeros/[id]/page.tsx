import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardCheck, ShieldAlert, History } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireOrg } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { SELECTABLE_STATUSES, STATUS_LABELS } from "@/lib/health";
import { PROVIDER_LABELS } from "@/lib/providers";
import { createCheck } from "./actions";
import { HealthChart } from "./health-chart";
import { DeleteNumberButton } from "./delete-number-button";
import { EditNumberDialog } from "./edit-number-dialog";

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

  const [checks, incidents] = await Promise.all([
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
  ]);

  const chartData = [...checks]
    .reverse()
    .map((c) => ({ date: c.createdAt.toISOString(), score: c.score, status: c.status }));

  const identityCard = (
    <div className="flex flex-col gap-4 rounded-[22px] bg-surface p-[22px_24px] min-[600px]:flex-row min-[600px]:items-start min-[600px]:justify-between">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.03em]">{number.label}</h1>
        <p className="font-mono text-[15px] text-ink-3">{number.e164}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">
            {PROVIDER_LABELS[number.provider] ?? number.provider}
          </span>
          <span className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">{org.name}</span>
        </div>
      </div>
      <div className="flex flex-col items-start gap-1.5 min-[600px]:items-end">
        <StatusPill status={number.currentStatus} />
        <span className="type-meta text-ink-3">
          desde {(number.lastCheckAt ?? number.updatedAt).toLocaleString("pt-BR")}
        </span>
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
      {checks.length === 0 ? (
        <p className="type-body-sm text-ink-3">Nenhum check registrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {checks.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-1 gap-1.5 rounded-[15px] bg-row px-4 py-3 min-[900px]:grid-cols-[150px_78px_1fr_auto] min-[900px]:items-center min-[900px]:gap-3"
            >
              <StatusPill status={c.status} />
              <span className="font-mono text-xs text-ink-3">score {c.score}</span>
              <span className="type-body-sm truncate text-ink-2">{c.observation || "—"}</span>
              <span className="type-meta whitespace-nowrap text-ink-3">
                {c.createdAt.toLocaleString("pt-BR")} · {c.source === "API" ? "automático" : "manual"}
              </span>
            </div>
          ))}
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
              provider={number.provider}
              movableOrgs={movableOrgs}
            />
            <DeleteNumberButton orgSlug={orgSlug} numberId={id} label={number.label} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 min-[900px]:hidden">
        {identityCard}
        {registerCheckCard}
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
          {incidentsCard}
        </div>
      </div>
    </div>
  );
}
