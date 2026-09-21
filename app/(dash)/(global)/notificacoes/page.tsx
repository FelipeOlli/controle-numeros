import { Mail, Webhook, MessageCircle, Radio, UserCog, BatteryCharging } from "lucide-react";
import { CHIP_PLAN_LABELS } from "@/lib/providers";
import type { ChipPlan } from "@/generated/prisma/enums";
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
  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });

  const personalCard = (
    <div className="flex flex-col gap-4 rounded-[22px] bg-accent p-6">
      <span className="flex items-center gap-2 text-[19px] font-bold tracking-[-0.02em] text-accent-ink">
        <UserCog size={18} />
        Minha notificação
      </span>
      <p className="text-[13px] text-accent-ink/85">
        Avisos por e-mail dos números das empresas que você tem acesso.
      </p>
      <PersonalNotifyForm
        notifyEnabled={user?.notifyEnabled ?? false}
        notifyEmail={user?.notifyEmail ?? null}
        accountEmail={user?.email ?? ""}
      />
    </div>
  );

  if (!isOwnerSomewhere) {
    return (
      <div className="flex flex-col gap-6 py-1">
        <div>
          <h1 className="type-page-title">Minhas notificações</h1>
          <p className="type-body-sm text-ink-3">
            Avisos por e-mail dos números das empresas que você tem acesso.
          </p>
        </div>
        <div className="max-w-[420px]">{personalCard}</div>
      </div>
    );
  }

  const [channels, rawLogs] = await Promise.all([
    prisma.alertChannel.findMany(),
    prisma.alertLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { phoneNumber: { include: { org: true } }, channel: true },
    }),
  ]);

  const logs = rawLogs.map((l) => {
    const event =
      l.payload && typeof l.payload === "object" ? (l.payload as { event?: string }).event : undefined;
    return {
      ...l,
      chipPlanChange: event === "chip_plan_changed" ? (l.payload as { from: string | null; to: string }) : null,
      chipNotesChange:
        event === "chip_notes_changed" ? (l.payload as { from: string | null; to: string | null }) : null,
    };
  });

  const activeCount = channels.filter((c) => c.enabled).length;

  return (
    <div className="flex flex-col gap-4 py-1">
      <div>
        <h1 className="type-page-title">Alertas</h1>
        <p className="type-body-sm text-ink-3">Canais globais, valem pra qualquer empresa da plataforma.</p>
      </div>

      <div className="flex flex-col gap-4 min-[900px]:hidden">
        {personalCard}
        <ChannelsCard channels={channels} activeCount={activeCount} />
        <NewChannelCard />
        <LogsCard logs={logs} />
      </div>

      <div className="hidden min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_380px] min-[900px]:items-start min-[900px]:gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <ChannelsCard channels={channels} activeCount={activeCount} />
          <LogsCard logs={logs} />
        </div>
        <div className="flex flex-col gap-4">
          {personalCard}
          <NewChannelCard />
        </div>
      </div>
    </div>
  );
}

function ChannelsCard({
  channels,
  activeCount,
}: {
  channels: { id: string; kind: string; config: unknown; enabled: boolean }[];
  activeCount: number;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[22px] bg-surface p-[22px_24px]">
      <div className="flex items-center gap-2.5">
        <span className="type-card-title">Canais globais</span>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[13px] font-semibold text-accent-deep">
          {activeCount} ativo{activeCount === 1 ? "" : "s"}
        </span>
      </div>
      {channels.length === 0 ? (
        <p className="type-body-sm text-ink-3">Nenhum canal configurado.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {channels.map((c) => {
            const Icon = KIND_ICONS[c.kind] ?? Radio;
            return (
              <div
                key={c.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[15px] bg-row px-4 py-3 min-[900px]:grid-cols-[auto_1fr_auto_auto]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-2">
                  <Icon size={15} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink">{KIND_LABELS[c.kind] ?? c.kind}</div>
                  <div className="truncate font-mono text-xs text-ink-3">
                    {JSON.stringify(c.config).slice(0, 60)}
                  </div>
                </div>
                <span
                  className={`hidden text-xs font-medium min-[900px]:flex ${
                    c.enabled ? "text-accent-deep" : "text-ink-3"
                  }`}
                >
                  {c.enabled ? "ativo" : "inativo"}
                </span>
                <ToggleButton channelId={c.id} enabled={c.enabled} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewChannelCard() {
  return (
    <div className="flex flex-col gap-4 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="type-card-title-sm">Novo canal</span>
      <NewChannelForm />
    </div>
  );
}

function LogsCard({
  logs,
}: {
  logs: {
    id: string;
    ok: boolean;
    error: string | null;
    createdAt: Date;
    phoneNumber: { label: string; org: { name: string } };
    channel: { kind: string } | null;
    chipPlanChange: { from: string | null; to: string } | null;
    chipNotesChange: { from: string | null; to: string | null } | null;
  }[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="type-card-title-sm">Últimos disparos</span>
      {logs.length === 0 ? (
        <p className="type-body-sm text-ink-3">Nenhuma notificação disparada ainda.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line-2">
          {logs.map((l) => {
            if (l.chipPlanChange) {
              return (
                <div key={l.id} className="flex flex-col gap-1 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <BatteryCharging size={13} className="shrink-0 text-ink-3" />
                    <span className="truncate">
                      {l.phoneNumber.label} → plano{" "}
                      {CHIP_PLAN_LABELS[l.chipPlanChange.to as ChipPlan] ?? l.chipPlanChange.to}
                    </span>
                  </div>
                  <span className="type-meta text-ink-3">
                    {l.phoneNumber.org.name} · {l.createdAt.toLocaleString("pt-BR")}
                  </span>
                </div>
              );
            }

            if (l.chipNotesChange) {
              return (
                <div key={l.id} className="flex flex-col gap-1 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <BatteryCharging size={13} className="shrink-0 text-ink-3" />
                    <span className="truncate">{l.phoneNumber.label} → observações alteradas</span>
                  </div>
                  <span className="type-meta text-ink-3">
                    {l.phoneNumber.org.name} · {l.createdAt.toLocaleString("pt-BR")}
                  </span>
                </div>
              );
            }

            return (
              <div key={l.id} className="flex flex-col gap-1 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {l.phoneNumber.label} →{" "}
                    {l.channel ? KIND_LABELS[l.channel.kind] ?? l.channel.kind : "E-mail pessoal"}
                  </span>
                  <span className={l.ok ? "text-accent-deep" : "text-danger-deep"}>
                    {l.ok ? "ok" : `falhou · ${l.error ?? "erro"}`}
                  </span>
                </div>
                <span className="type-meta text-ink-3">
                  {l.phoneNumber.org.name} · {l.createdAt.toLocaleString("pt-BR")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
