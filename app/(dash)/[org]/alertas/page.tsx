import { Mail, Webhook, MessageCircle, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { ToggleButton } from "./toggle-button";
import { NewChannelForm } from "./new-channel-form";

const KIND_LABELS: Record<string, string> = {
  EMAIL: "E-mail",
  WEBHOOK: "Webhook (n8n)",
  WHATSAPP: "WhatsApp",
};

const KIND_ICONS: Record<string, LucideIcon> = {
  EMAIL: Mail,
  WEBHOOK: Webhook,
  WHATSAPP: MessageCircle,
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
        <h1 className="mb-3 text-xl font-semibold tracking-tight">Canais de alerta</h1>
        <ul className="flex flex-col gap-2">
          {channels.map((c) => {
            const Icon = KIND_ICONS[c.kind] ?? Radio;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-accent">
                    <Icon size={14} />
                  </span>
                  <span className="font-medium text-foreground">
                    {KIND_LABELS[c.kind] ?? c.kind}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {JSON.stringify(c.config).slice(0, 60)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      c.enabled
                        ? "flex items-center gap-1 text-xs text-accent"
                        : "flex items-center gap-1 text-xs text-muted-foreground"
                    }
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${c.enabled ? "bg-accent" : "bg-muted-foreground"}`}
                    />
                    {c.enabled ? "ativo" : "inativo"}
                  </span>
                  {canManage && (
                    <ToggleButton orgSlug={orgSlug} channelId={c.id} enabled={c.enabled} />
                  )}
                </div>
              </li>
            );
          })}
          {channels.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum canal configurado.</p>
          )}
        </ul>
      </section>

      {canManage && (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-foreground">Novo canal</h2>
          <NewChannelForm orgSlug={orgSlug} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground">Últimos disparos</h2>
        <ul className="flex flex-col gap-2">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm"
            >
              <span>
                {l.phoneNumber.label} → {KIND_LABELS[l.channel.kind] ?? l.channel.kind}
              </span>
              <span className={l.ok ? "text-accent" : "text-destructive"}>
                {l.ok ? "ok" : l.error ?? "falhou"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {l.createdAt.toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum alerta disparado ainda.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
