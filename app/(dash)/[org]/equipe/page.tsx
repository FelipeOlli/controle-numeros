import { UserPlus, Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { inviteMember } from "./actions";
import { RemoveButton } from "./remove-button";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  VIEWER: "Visualizador",
};

export default async function EquipePage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const { org, role, userId } = await requireOrg(orgSlug);
  const canManage = role === "OWNER" || role === "ADMIN";
  const isOwner = role === "OWNER";

  const [members, invites] = await Promise.all([
    prisma.membership.findMany({
      where: { orgId: org.id },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { role: "asc" },
    }),
    prisma.invite.findMany({
      where: { orgId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-3 text-xl font-semibold tracking-tight">Membros</h1>
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-foreground">
                  {(m.user.name ?? m.user.email).slice(0, 2)}
                </span>
                <span className="text-foreground">{m.user.name ?? m.user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                {isOwner && m.userId !== userId && (
                  <RemoveButton orgSlug={orgSlug} membershipId={m.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-foreground">Convidar membro</h2>
          <form action={inviteMember.bind(null, orgSlug)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">E-mail</label>
              <input name="email" type="email" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Papel</label>
              <select name="role" defaultValue="VIEWER" className={inputClass}>
                <option value="VIEWER">Visualizador</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:brightness-110"
            >
              <UserPlus size={15} />
              Enviar convite
            </button>
          </form>
        </section>
      )}

      {invites.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock size={15} className="text-accent" />
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
                  {ROLE_LABELS[i.role] ?? i.role} · expira{" "}
                  {i.expiresAt.toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
