import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { createChannel } from "./actions";
import { ToggleButton } from "./toggle-button";

const KIND_LABELS: Record<string, string> = {
  EMAIL: "E-mail",
  WEBHOOK: "Webhook (n8n)",
  WHATSAPP: "WhatsApp",
};

export default async function AlertasPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const { org, role } = await requireOrg(orgSlug);
  const canManage = role === "OWNER" || role === "ADMIN";

  const [channels, logs] = await Promise.all([
    prisma.alertChannel.findMany({ where: { orgId: org.id } }),
    prisma.alertLog.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { phoneNumber: true, channel: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-3 text-lg font-semibold">Canais de alerta</h1>
        <ul className="flex flex-col gap-2">
          {channels.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{KIND_LABELS[c.kind] ?? c.kind}</span>
                <span className="text-neutral-500">
                  {JSON.stringify(c.config).slice(0, 60)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={c.enabled ? "text-emerald-400" : "text-neutral-500"}>
                  {c.enabled ? "ativo" : "inativo"}
                </span>
                {canManage && (
                  <ToggleButton orgSlug={orgSlug} channelId={c.id} enabled={c.enabled} />
                )}
              </div>
            </li>
          ))}
          {channels.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum canal configurado.</p>
          )}
        </ul>
      </section>

      {canManage && (
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-300">Novo canal</h2>
          <form action={createChannel.bind(null, orgSlug)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Tipo</label>
              <select
                name="kind"
                defaultValue="EMAIL"
                className="w-48 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              >
                <option value="EMAIL">E-mail</option>
                <option value="WEBHOOK">Webhook (n8n)</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">E-mail (canal E-mail)</label>
                <input
                  name="to"
                  type="email"
                  className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">URL do webhook</label>
                <input
                  name="url"
                  type="url"
                  className="w-64 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">URL de envio (Evolution/Meta)</label>
                <input
                  name="sendUrl"
                  type="url"
                  className="w-64 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">API key</label>
                <input
                  name="apiKey"
                  className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-fit rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
            >
              Adicionar canal
            </button>
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-300">Últimos disparos</h2>
        <ul className="flex flex-col gap-2">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              <span>
                {l.phoneNumber.label} → {KIND_LABELS[l.channel.kind] ?? l.channel.kind}
              </span>
              <span className={l.ok ? "text-emerald-400" : "text-red-400"}>
                {l.ok ? "ok" : l.error ?? "falhou"}
              </span>
              <span className="text-neutral-500">
                {l.createdAt.toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum alerta disparado ainda.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
