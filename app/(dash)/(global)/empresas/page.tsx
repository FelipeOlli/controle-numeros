import Link from "next/link";
import { Building2, Plus, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrgHealth, formatOrgHealthSummary } from "@/lib/org-health";
import { Input } from "@/components/ui/input";
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

  const healthByOrgId = await getOrgHealth(memberships.map((m) => m.orgId));
  const ownedOrgs = memberships.filter((m) => m.role === "OWNER");

  return (
    <div className="flex flex-col gap-6 py-1">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="type-page-title">Empresas</h1>
          <p className="type-body-sm text-ink-3">
            {memberships.length} empresa{memberships.length === 1 ? "" : "s"} vinculada
            {memberships.length === 1 ? "" : "s"} à sua conta
          </p>
        </div>
        {canCreate && <NewOrgForm />}
      </div>

      <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {memberships.map((m) => {
          const health = healthByOrgId.get(m.orgId);
          const summary = health ? formatOrgHealthSummary(health) : "Nenhum número";
          return (
            <div key={m.orgId} className="flex flex-col gap-4 rounded-[22px] bg-surface p-[22px_24px]">
              <Link href={`/${m.orgSlug}/numeros`} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-deep">
                    <Building2 size={18} />
                  </span>
                  <span className="rounded-full bg-row px-2.5 py-1 text-xs text-ink-2">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </div>
                <div>
                  <span className="type-card-title-sm block">{m.orgName}</span>
                  <p className="type-body-sm text-ink-3">
                    {health && health.total === 0 ? "Nenhum número · Cadastre o primeiro número" : summary}
                  </p>
                </div>
              </Link>
              <div className="flex items-center justify-between border-t border-line-2 pt-3">
                <Link
                  href={`/${m.orgSlug}/numeros`}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-link hover:text-ink"
                >
                  Abrir números
                  <ArrowRight size={14} />
                </Link>
                {m.role === "OWNER" && (
                  <div className="flex gap-1.5">
                    <EditOrgDialog orgSlug={m.orgSlug} name={m.orgName} />
                    <DeleteOrgDialog
                      orgSlug={m.orgSlug}
                      name={m.orgName}
                      numberCount={health?.total ?? 0}
                      otherOrgs={ownedOrgs
                        .filter((o) => o.orgId !== m.orgId)
                        .map((o) => ({ slug: o.orgSlug, name: o.orgName }))}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewOrgForm() {
  return (
    <form action={createOrganization} className="flex flex-wrap items-center gap-2.5">
      <Input
        name="name"
        required
        minLength={2}
        placeholder="Nome da nova empresa"
        className="w-64"
      />
      <Button type="submit" variant="pill" size="pill-sm">
        <Plus size={16} />
        Cadastrar empresa
      </Button>
    </form>
  );
}
