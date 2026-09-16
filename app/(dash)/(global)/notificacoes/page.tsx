import { Mail, Webhook, MessageCircle, Radio, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ToggleButton } from "./toggle-button";
import { NewChannelForm } from "./new-channel-form";
import { PersonalNotifyForm } from "./personal-notify-form";

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

export default async function NotificacoesPage() {
  const session = await auth();
  const isOwnerSomewhere = session!.memberships.some((m) => m.role === "OWNER");

  // Quem administra alguma empresa vê a config geral da plataforma; quem
  // não é OWNER em lugar nenhum só decide se quer receber aviso ou não.
  if (!isOwnerSomewhere) {
    const user = await prisma.user.findUnique({ where: { id: session!.user.id } });

    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Minhas notificações</h1>
          <p className="text-sm text-muted-foreground">
            Avisos por e-mail dos números das empresas que você tem acesso.
          </p>
        </div>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <UserCog size={16} className="text-primary" />
            Minha notificação
          </h2>
          <PersonalNotifyForm
            notifyEnabled={user?.notifyEnabled ?? false}
            notifyEmail={user?.notifyEmail ?? null}
            accountEmail={user?.email ?? ""}
          />
        </section>
      </div>
    );
  }

  const [channels, logs] = await Promise.all([
    prisma.alertChannel.findMany(),
    prisma.alertLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { phoneNumber: { include: { org: true } }, channel: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Canais de notificação da plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Canais globais, valem pra qualquer empresa da plataforma.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground">Canais globais</h2>
        <ul className="flex flex-col gap-2">
          {channels.map((c) => {
            const Icon = KIND_ICONS[c.kind] ?? Radio;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-primary">
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
                        ? "flex items-center gap-1 text-xs text-primary"
                        : "flex items-center gap-1 text-xs text-muted-foreground"
                    }
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${c.enabled ? "bg-primary" : "bg-muted-foreground"}`}
                    />
                    {c.enabled ? "ativo" : "inativo"}
                  </span>
                  <ToggleButton channelId={c.id} enabled={c.enabled} />
                </div>
              </li>
            );
          })}
          {channels.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum canal configurado.</p>
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-foreground">Novo canal</h2>
        <NewChannelForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground">Últimos disparos</h2>
        <ul className="flex flex-col gap-2">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm"
            >
              <span>
                {l.phoneNumber.org.name} · {l.phoneNumber.label} →{" "}
                {l.channel ? KIND_LABELS[l.channel.kind] ?? l.channel.kind : "E-mail pessoal"}
              </span>
              <span className={l.ok ? "text-primary" : "text-destructive"}>
                {l.ok ? "ok" : l.error ?? "falhou"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {l.createdAt.toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma notificação disparada ainda.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
