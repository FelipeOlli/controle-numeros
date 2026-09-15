import Link from "next/link";
import { Plus, Inbox } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { createNumber } from "./actions";

const PROVIDER_LABELS: Record<string, string> = {
  IUNGO: "Iungo",
  CHIP_FISICO: "Chip físico",
  META_CLOUD: "Meta Cloud API",
  EVOLUTION: "Evolution API",
  ZAPI: "Z-API",
};

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export default async function NumerosPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const { org, role } = await requireOrg(orgSlug);

  const rawNumbers = await prisma.phoneNumber.findMany({
    where: { orgId: org.id },
    orderBy: { label: "asc" },
  });

  // Enum não tem ordem semântica no banco; ordena por gravidade na aplicação.
  const severity: Record<string, number> = {
    BANNED: 0,
    RED: 1,
    UNKNOWN: 2,
    YELLOW: 3,
    GREEN: 4,
  };
  const numbers = [...rawNumbers].sort(
    (a, b) => severity[a.currentStatus] - severity[b.currentStatus],
  );

  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Números</h1>
        <p className="text-sm text-muted-foreground">
          {numbers.length} número{numbers.length === 1 ? "" : "s"} monitorado
          {numbers.length === 1 ? "" : "s"}
        </p>
      </div>

      {numbers.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-muted-foreground">
          <Inbox size={28} />
          <p className="text-sm">Nenhum número cadastrado ainda.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {numbers.map((n) => (
          <Link
            key={n.id}
            href={`/${orgSlug}/numeros/${n.id}`}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-foreground">{n.label}</span>
              <StatusBadge status={n.currentStatus} />
            </div>
            <span className="font-mono text-sm text-muted-foreground">{n.e164}</span>
            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5">
                {PROVIDER_LABELS[n.provider] ?? n.provider}
              </span>
              <span className="font-mono">score {n.currentScore}</span>
            </div>
          </Link>
        ))}
      </div>

      {canManage && (
        <form
          action={createNumber.bind(null, orgSlug)}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Nome/label</label>
            <input name="label" required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Número (E.164)</label>
            <input
              name="e164"
              placeholder="+5511999999999"
              required
              className={`font-mono ${inputClass}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Origem</label>
            <select name="provider" className={inputClass}>
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">
            <Plus size={16} />
            Adicionar número
          </Button>
        </form>
      )}
    </div>
  );
}
