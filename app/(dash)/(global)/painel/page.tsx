import Link from "next/link";
import { Settings2, Maximize2, Plus, Radio, Info } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgHealth } from "@/lib/org-health";
import { AttentionQueue, type AttentionItem } from "@/components/attention-queue";
import { OrgHealthRadar, OrgHealthList } from "@/components/org-health-radar";
import type { HealthStatus } from "@/generated/prisma/enums";

const SEVERITY: Record<HealthStatus, number> = {
  BANNED: 0,
  RED: 1,
  LOST: 2,
  UNKNOWN: 2,
  YELLOW: 3,
  GREEN: 4,
};

const DEFAULT_REASON: Record<string, string> = {
  YELLOW: "Provedor sinalizou qualidade média no número.",
  RED: "Falha de envio confirmada em check manual.",
  BANNED: "Conta bloqueada pelo WhatsApp.",
  LOST: "Número perdido — sem acesso à conta.",
  UNKNOWN: "Nenhum check há mais de 72h — status desatualizado pelo worker.",
};

export default async function PainelPage() {
  const session = await auth();
  const memberships = session!.memberships;
  const orgIds = memberships.map((m) => m.orgId);

  const [numbers, orgHealthMap] = await Promise.all([
    orgIds.length
      ? prisma.phoneNumber.findMany({ where: { orgId: { in: orgIds } } })
      : Promise.resolve([]),
    getOrgHealth(orgIds),
  ]);

  const orgNameById = new Map(memberships.map((m) => [m.orgId, m.orgName]));
  const orgSlugById = new Map(memberships.map((m) => [m.orgId, m.orgSlug]));

  const nonGreen = numbers.filter((n) => n.currentStatus !== "GREEN");
  const healthyNumbers = numbers.filter((n) => n.currentStatus === "GREEN");

  const recentChecks = nonGreen.length
    ? await prisma.healthCheck.findMany({
        where: { phoneNumberId: { in: nonGreen.map((n) => n.id) } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const latestObservationByNumberId = new Map<string, string | null>();
  for (const check of recentChecks) {
    if (!latestObservationByNumberId.has(check.phoneNumberId)) {
      latestObservationByNumberId.set(check.phoneNumberId, check.observation);
    }
  }

  const attentionItems: AttentionItem[] = [...nonGreen]
    .sort((a, b) => SEVERITY[a.currentStatus] - SEVERITY[b.currentStatus])
    .map((n) => ({
      id: n.id,
      orgSlug: orgSlugById.get(n.orgId) ?? "",
      orgName: orgNameById.get(n.orgId) ?? "",
      label: n.label,
      e164: n.e164,
      origin: n.origin,
      platforms: n.platforms,
      status: n.currentStatus as AttentionItem["status"],
      reason: latestObservationByNumberId.get(n.id) || DEFAULT_REASON[n.currentStatus] || "Sem detalhes.",
      lastCheckAt: n.lastCheckAt,
    }));

  const total = numbers.length;
  const healthyCount = healthyNumbers.length;
  const attentionCount = numbers.filter((n) => n.currentStatus === "YELLOW").length;
  const criticalCount = total - healthyCount - attentionCount;
  const pct = (value: number) => (total ? Math.round((value / total) * 100) : 0);

  const orgHealthEntries = memberships
    .map((m) => ({
      orgId: m.orgId,
      name: m.orgName,
      pct: orgHealthMap.get(m.orgId)?.healthyPct ?? 0,
    }))
    .slice(0, 5);

  const addNumberHref = memberships.length === 1 ? `/${memberships[0].orgSlug}/numeros` : "/empresas";

  const nextScanMinutes = 60 - new Date().getMinutes();

  const radarCard = (
    <div className="flex flex-col gap-[18px] rounded-[22px] bg-surface p-[22px_24px]">
      <div className="flex items-center gap-2.5">
        <span className="type-card-title">Saúde por empresa</span>
        <button
          type="button"
          className="ml-auto flex h-[30px] w-[30px] items-center justify-center rounded-full bg-row text-ink-3"
          aria-label="Configurar"
        >
          <Settings2 size={15} strokeWidth={1.9} />
        </button>
      </div>
      {orgHealthEntries.length >= 3 && <OrgHealthRadar entries={orgHealthEntries} />}
      <OrgHealthList entries={orgHealthEntries} />
    </div>
  );

  const orgHealthListOnlyCard = (
    <div className="flex flex-col gap-[18px] rounded-[22px] bg-surface p-[22px_24px]">
      <span className="type-card-title">Saúde por empresa</span>
      <OrgHealthList entries={orgHealthEntries} />
    </div>
  );

  const registerCheckCard = (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] bg-accent p-6">
      <span className="pointer-events-none absolute -right-10 -bottom-15 h-[180px] w-[180px] rounded-full bg-black/10 dark:bg-black/10" />
      <span className="pointer-events-none absolute top-6 right-6 h-11 w-11 rounded-xl bg-black/14 dark:bg-black/14" />
      <span className="relative max-w-[210px] text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-accent-ink">
        Registrar um check
      </span>
      <span className="relative max-w-[220px] text-[13px] leading-[1.5] text-accent-ink/85">
        Confirme manualmente a situação de um número e o histórico é atualizado na hora.
      </span>
      <Link
        href="/numeros"
        className="relative w-fit rounded-full bg-white px-[22px] py-[11px] text-sm font-bold text-accent-deep"
      >
        Abrir formulário
      </Link>
    </div>
  );

  const queueCard = (
    <div className="flex min-w-0 flex-col gap-[18px] rounded-[22px] bg-surface p-[22px_24px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="type-card-title">Fila de atenção</span>
        <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[13px] font-semibold text-danger-deep">
          {nonGreen.length} número{nonGreen.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          className="ml-auto flex h-[30px] w-[30px] items-center justify-center rounded-full bg-row text-ink-3"
          aria-label="Expandir"
        >
          <Maximize2 size={15} strokeWidth={2} />
        </button>
      </div>
      <AttentionQueue items={attentionItems} />
    </div>
  );

  const healthyCard = (
    <div className="flex flex-col gap-[14px] rounded-[22px] bg-surface p-[22px_24px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="type-card-title-sm">Saudáveis</span>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[13px] font-semibold text-accent-deep">
          {healthyNumbers.length} número{healthyNumbers.length === 1 ? "" : "s"}
        </span>
      </div>
      {healthyNumbers.length === 0 ? (
        <p className="type-body-sm text-ink-3">Nenhum número saudável ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 min-[600px]:grid-cols-2">
          {healthyNumbers.map((n) => (
            <div key={n.id} className="flex items-center gap-2 text-[13px]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
              <span className="truncate font-medium">{n.label}</span>
              <span className="ml-auto shrink-0 font-mono text-xs text-ink-3">{n.e164}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const kpiAttentionCard = (
    <div className="flex flex-col gap-2 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="text-sm font-semibold text-ink-2">Precisam de atenção</span>
      <div className="flex items-baseline gap-2">
        <span className="type-kpi-lg">{pct(attentionCount + criticalCount)}%</span>
        <span className="text-sm font-semibold text-ink-3">
          {attentionCount + criticalCount} de {total}
        </span>
      </div>
      <span className="w-fit rounded-full bg-danger px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.03em] text-danger-ink">
        Atenção!
      </span>
    </div>
  );

  const kpiHealthyCard = (
    <div className="flex flex-col gap-2 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="text-sm font-semibold text-ink-2">Números saudáveis</span>
      <div className="flex items-baseline gap-2">
        <span className="type-kpi-lg">{pct(healthyCount)}%</span>
        <span className="text-sm font-semibold text-ink-3">
          {healthyCount} de {total}
        </span>
      </div>
      <span className="w-fit rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.03em] text-accent-deep">
        Estável
      </span>
      <div className="mt-2 flex items-start gap-2 rounded-[14px] bg-row p-3 text-[11.5px] text-ink-2">
        <Info size={14} className="mt-0.5 shrink-0 text-ink-3" />
        Um número sem check há mais de 72h vira &quot;sem dados&quot; automaticamente.
      </div>
    </div>
  );

  const addNumberButton = (
    <Link
      href={addNumberHref}
      className="flex items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-line-dashed py-4 text-sm font-semibold text-ink-2 transition hover:border-accent hover:text-accent-deep"
    >
      <Plus size={16} />
      Adicionar número
    </Link>
  );

  const workerStrip = (
    <div className="flex items-center gap-2 rounded-[22px] bg-surface px-[18px] py-3.5 text-[13px]">
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
      <span className="font-semibold">Worker ativo</span>
      <span className="ml-auto text-ink-3">em {nextScanMinutes} min</span>
    </div>
  );

  const distributionCard = (
    <div className="flex flex-col gap-4 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="type-card-title-sm">Distribuição</span>
      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold">{pct(healthyCount)}%</span>
          <span className="text-xs text-ink-3">Saudável</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold">{pct(attentionCount)}%</span>
          <span className="text-xs text-ink-3">Atenção</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold">{pct(criticalCount)}%</span>
          <span className="text-xs text-ink-3">Crítico</span>
        </div>
      </div>
      <div className="flex h-[9px] gap-0.5 overflow-hidden rounded-full">
        <span className="h-full rounded-full bg-accent" style={{ width: `${pct(healthyCount)}%` }} />
        <span className="h-full rounded-full bg-warn" style={{ width: `${pct(attentionCount)}%` }} />
        <span className="h-full rounded-full bg-danger" style={{ width: `${pct(criticalCount)}%` }} />
      </div>
    </div>
  );

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[22px] bg-surface py-16 text-center">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-row text-ink-3">
          <Radio size={22} />
        </span>
        <p className="type-card-title-sm">Nenhum número cadastrado ainda</p>
        <p className="type-body-sm max-w-xs text-ink-3">
          Cadastre a primeira empresa e o primeiro número para começar a acompanhar a saúde.
        </p>
        <Link
          href="/empresas"
          className="rounded-full bg-pill-active px-5 py-2.5 text-sm font-semibold text-pill-active-ink"
        >
          Ir para Empresas
        </Link>
      </div>
    );
  }

  return (
    <div className="py-1">
      {/* mobile: fila de atenção → KPIs → saúde por empresa → distribuição */}
      <div className="flex flex-col gap-4 min-[900px]:hidden">
        {queueCard}
        {healthyCard}
        {kpiAttentionCard}
        {kpiHealthyCard}
        {addNumberButton}
        {registerCheckCard}
        {orgHealthListOnlyCard}
        {workerStrip}
        {distributionCard}
      </div>

      <div className="hidden min-[900px]:grid min-[900px]:grid-cols-[340px_minmax(0,1fr)_300px] min-[900px]:items-start min-[900px]:gap-4">
        <div className="flex flex-col gap-4">
          {radarCard}
          {registerCheckCard}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {queueCard}
          {healthyCard}
        </div>
        <div className="flex flex-col gap-4">
          {kpiAttentionCard}
          {kpiHealthyCard}
          {addNumberButton}
          {workerStrip}
          {distributionCard}
        </div>
      </div>
    </div>
  );
}
