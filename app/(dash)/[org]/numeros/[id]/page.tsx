import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { StatusBadge } from "../status-badge";
import { createCheck } from "./actions";
import { HealthChart } from "./health-chart";

export default async function NumberDetailPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org: orgSlug, id } = await params;
  const { org } = await requireOrg(orgSlug);

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
        <div>
          <h1 className="text-lg font-semibold">{number.label}</h1>
          <p className="text-sm text-neutral-400">{number.e164}</p>
        </div>
        <StatusBadge status={number.currentStatus} />
      </div>

      {checks.length > 1 && (
        <HealthChart
          data={[...checks]
            .reverse()
            .map((c) => ({ date: c.createdAt.toISOString(), score: c.score }))}
        />
      )}

      <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-300">
          Registrar check manual
        </h2>
        <form
          action={createCheck.bind(null, orgSlug, id)}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Qualidade</label>
            <select
              name="qualityRating"
              className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="GREEN">Verde</option>
              <option value="YELLOW">Amarelo</option>
              <option value="RED">Vermelho</option>
              <option value="UNKNOWN">Desconhecido</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Avisos recebidos</label>
            <input
              type="number"
              name="warningsCount"
              min={0}
              defaultValue={0}
              className="w-24 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" name="banned" className="accent-red-500" />
            Banido
          </label>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-neutral-400">Observação</label>
            <input
              name="observation"
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Salvar check
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-300">Incidentes</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum incidente registrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {incidents.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
              >
                <span>
                  {i.fromStatus} → {i.toStatus}
                </span>
                <span className="text-neutral-500">
                  {i.openedAt.toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-300">Histórico de checks</h2>
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <StatusBadge status={c.status} />
                <span className="text-neutral-400">score {c.score}</span>
                {c.observation && <span className="text-neutral-500">{c.observation}</span>}
              </div>
              <span className="text-neutral-500">
                {c.createdAt.toLocaleString("pt-BR")} · {c.source === "API" ? "automático" : "manual"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
