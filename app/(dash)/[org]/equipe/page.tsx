import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { inviteMember } from "./actions";
import { RemoveButton } from "./remove-button";

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
        <h1 className="mb-3 text-lg font-semibold">Membros</h1>
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              <span>{m.user.name ?? m.user.email}</span>
              <div className="flex items-center gap-3">
                <span className="text-neutral-500">{m.role}</span>
                {isOwner && m.userId !== userId && (
                  <RemoveButton orgSlug={orgSlug} membershipId={m.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-300">Convidar membro</h2>
          <form action={inviteMember.bind(null, orgSlug)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">E-mail</label>
              <input
                name="email"
                type="email"
                required
                className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Papel</label>
              <select
                name="role"
                defaultValue="VIEWER"
                className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              >
                <option value="VIEWER">Visualizador</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
            >
              Enviar convite
            </button>
          </form>
        </section>
      )}

      {invites.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-neutral-300">Convites pendentes</h2>
          <ul className="flex flex-col gap-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
              >
                <span>{i.email}</span>
                <span className="text-neutral-500">
                  {i.role} · expira {i.expiresAt.toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
