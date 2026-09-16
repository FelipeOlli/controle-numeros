import Link from "next/link";
import { Building2, Plus, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { createOrganization } from "./actions";
import { EditOrgDialog } from "./edit-org-dialog";
import { DeleteOrgDialog } from "./delete-org-dialog";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  VIEWER: "Visualizador",
};

export default async function EmpresasPage() {
  const session = await auth();
  const memberships = session!.memberships;
  const canCreate = memberships.some((m) => m.role === "OWNER");

  const counts = await prisma.phoneNumber.groupBy({
    by: ["orgId"],
    where: { orgId: { in: memberships.map((m) => m.orgId) } },
    _count: { _all: true },
  });
  const countByOrgId = new Map(counts.map((c) => [c.orgId, c._count._all]));

  const ownedOrgs = memberships.filter((m) => m.role === "OWNER");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Empresas</h1>
        <p className="text-sm text-muted-foreground">
          {memberships.length} empresa{memberships.length === 1 ? "" : "s"} vinculada
          {memberships.length === 1 ? "" : "s"} à sua conta
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {memberships.map((m) => {
          const numberCount = countByOrgId.get(m.orgId) ?? 0;
          return (
            <div
              key={m.orgId}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <Link href={`/${m.orgSlug}/numeros`} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-primary">
                    <Building2 size={17} />
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">{m.orgName}</span>
                    <p className="text-xs text-muted-foreground">
                      {numberCount} número{numberCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ArrowRight size={15} className="text-muted-foreground" />
                </div>
              </Link>
              {m.role === "OWNER" && (
                <div className="flex gap-2 border-t border-border pt-3">
                  <EditOrgDialog orgSlug={m.orgSlug} name={m.orgName} />
                  <DeleteOrgDialog
                    orgSlug={m.orgSlug}
                    name={m.orgName}
                    numberCount={numberCount}
                    otherOrgs={ownedOrgs
                      .filter((o) => o.orgId !== m.orgId)
                      .map((o) => ({ slug: o.orgSlug, name: o.orgName }))}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canCreate && (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-foreground">Nova empresa</h2>
          <form action={createOrganization} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Nome da empresa</label>
              <input
                name="name"
                required
                minLength={2}
                placeholder="Ex: Empresa Cliente Ltda"
                className="w-64 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button type="submit">
              <Plus size={16} />
              Cadastrar empresa
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
