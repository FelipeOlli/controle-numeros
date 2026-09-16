import { Clock, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InviteForm } from "./invite-form";
import { MemberCard } from "./member-card";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  VIEWER: "Visualizador",
};

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
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-muted-foreground">
          Você precisa ser OWNER de alguma empresa pra gerenciar acesso de equipe.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-muted-foreground">
          Controle de acesso e permissões pra todas as empresas que você administra.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-foreground">Convidar membro</h2>
        <InviteForm orgs={availableOrgs} />
      </section>

      {invites.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock size={15} className="text-primary" />
            Convites pendentes
          </h2>
          <ul className="flex flex-col gap-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm"
              >
                <span>{i.email}</span>
                <span className="text-xs text-muted-foreground">
                  {i.org.name} · {ROLE_LABELS[i.role] ?? i.role} · expira{" "}
                  {i.expiresAt.toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Users size={15} className="text-primary" />
          Membros
        </h2>
        <ul className="flex flex-col gap-2">
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
        </ul>
      </section>
    </div>
  );
}
