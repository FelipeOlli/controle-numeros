import { Clock, Users, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { InviteForm } from "./invite-form";
import { MemberCard } from "./member-card";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  VIEWER: "Visualizador",
};

const ROLE_EXPLANATIONS: { role: string; text: string }[] = [
  { role: "Owner", text: "Acesso completo: gerencia empresas, números, equipe e notificações." },
  { role: "Admin", text: "Gerencia números e checks da empresa, sem excluir a empresa ou a equipe." },
  { role: "Visualizador", text: "Só acompanha o status dos números, sem editar nada." },
];

export default async function EquipePage() {
  const session = await auth();
  const ownedOrgs = session!.memberships.filter((m) => m.role === "OWNER");
  const ownedOrgIds = ownedOrgs.map((m) => m.orgId);
  const availableOrgs = ownedOrgs.map((m) => ({ slug: m.orgSlug, name: m.orgName }));

  const [memberships, invites] = await Promise.all([
    prisma.membership.findMany({
      where: { orgId: { in: ownedOrgIds } },
      include: { user: true, org: true },
      orderBy: { user: { email: "asc" } },
    }),
    prisma.invite.findMany({
      where: { orgId: { in: ownedOrgIds }, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { org: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const byUser = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      notifyEnabled: boolean;
      access: { membershipId: string; orgSlug: string; orgName: string; role: string }[];
    }
  >();
  for (const m of memberships) {
    const entry = byUser.get(m.userId) ?? {
      userId: m.userId,
      name: m.user.name ?? "",
      email: m.user.email,
      notifyEnabled: m.user.notifyEnabled,
      access: [],
    };
    entry.access.push({
      membershipId: m.id,
      orgSlug: m.org.slug,
      orgName: m.org.name,
      role: m.role,
    });
    byUser.set(m.userId, entry);
  }

  if (ownedOrgIds.length === 0) {
    return (
      <div className="flex flex-col gap-2 py-1">
        <h1 className="type-page-title">Equipe</h1>
        <p className="type-body-sm text-ink-3">
          Você precisa ser OWNER de alguma empresa pra gerenciar acesso de equipe.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-1">
      <div>
        <h1 className="type-page-title">Equipe</h1>
        <p className="type-body-sm text-ink-3">
          Controle de acesso e permissões pra todas as empresas que você administra.
        </p>
      </div>

      <div className="rounded-[22px] bg-surface p-[22px_24px]">
        <InviteForm orgs={availableOrgs} />
      </div>

      <div className="flex flex-col gap-4 min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_380px] min-[900px]:items-start">
        <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px]">
          <span className="flex items-center gap-2 type-card-title-sm">
            <Users size={16} className="text-accent" />
            Membros
          </span>
          <div className="flex flex-col gap-2.5">
            {[...byUser.values()].map((u) => (
              <MemberCard
                key={u.userId}
                userId={u.userId}
                name={u.name}
                email={u.email}
                notifyEnabled={u.notifyEnabled}
                access={u.access}
                availableOrgs={availableOrgs}
                isSelf={u.userId === session!.user.id}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {invites.length > 0 && (
            <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px]">
              <span className="flex items-center gap-2 type-card-title-sm">
                <Clock size={16} className="text-accent" />
                Convites pendentes
              </span>
              <div className="flex flex-col divide-y divide-line-2">
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="truncate font-mono text-xs">{i.email}</span>
                    <span className="whitespace-nowrap text-xs text-ink-3">
                      {i.org.name} · {ROLE_LABELS[i.role] ?? i.role} · expira{" "}
                      {formatDate(i.expiresAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px]">
            <span className="flex items-center gap-2 type-card-title-sm">
              <ShieldCheck size={16} className="text-accent" />
              Papéis
            </span>
            <div className="flex flex-col divide-y divide-line-2">
              {ROLE_EXPLANATIONS.map((r) => (
                <div key={r.role} className="py-2.5">
                  <div className="text-sm font-semibold text-ink">{r.role}</div>
                  <p className="type-body-sm text-ink-3">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
