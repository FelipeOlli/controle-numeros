import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, ShieldAlert, History, Save } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ScoreRing } from "@/components/score-ring";
import { SELECTABLE_STATUSES, STATUS_LABELS } from "@/lib/health";
import { createCheck } from "./actions";
import { HealthChart } from "./health-chart";
import { DeleteNumberButton } from "./delete-number-button";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export default async function NumberDetailPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org: orgSlug, id } = await params;
  const { org, role } = await requireOrg(orgSlug);
  const canManage = role === "OWNER" || role === "ADMIN";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/${orgSlug}/numeros`}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={15} />
          Voltar
        </Link>
        {canManage && (
          <DeleteNumberButton orgSlug={orgSlug} numberId={id} label={number.label} />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{number.label}</h1>
          <p className="font-mono text-sm text-muted-foreground">{number.e164}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ScoreRing score={number.currentScore} status={number.currentStatus} size={64} />
          <StatusBadge status={number.currentStatus} />
        </div>
      </div>

      {checks.length > 1 && (
        <HealthChart
          data={[...checks]
            .reverse()
            .map((c) => ({ date: c.createdAt.toISOString(), score: c.score }))}
        />
      )}

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <ClipboardCheck size={16} className="text-primary" />
          Registrar status
        </h2>
        <form
          action={createCheck.bind(null, orgSlug, id)}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select name="status" required defaultValue="" className={`w-56 ${inputClass}`}>
              <option value="" disabled>
                Selecione o estado atual
              </option>
              {SELECTABLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Observação</label>
            <input name="observation" className={`w-full ${inputClass}`} />
          </div>
          <Button type="submit">
            <Save size={15} />
            Salvar
          </Button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldAlert size={16} className="text-primary" />
          Incidentes
        </h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum incidente registrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {incidents.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <span>
                  {STATUS_LABELS[i.fromStatus]} → {STATUS_LABELS[i.toStatus]}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {i.openedAt.toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <History size={16} className="text-primary" />
          Histórico de checks
        </h2>
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <StatusBadge status={c.status} />
                <span className="font-mono text-muted-foreground">score {c.score}</span>
                {c.observation && (
                  <span className="text-muted-foreground">{c.observation}</span>
                )}
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {c.createdAt.toLocaleString("pt-BR")} ·{" "}
                {c.source === "API" ? "automático" : "manual"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
