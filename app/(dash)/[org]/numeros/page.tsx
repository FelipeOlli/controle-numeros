import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { StatusBadge } from "./status-badge";
import { createNumber } from "./actions";

const PROVIDER_LABELS: Record<string, string> = {
  IUNGO: "Iungo",
  CHIP_FISICO: "Chip físico",
  META_CLOUD: "Meta Cloud API",
  EVOLUTION: "Evolution API",
  ZAPI: "Z-API",
};

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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Números</h1>
      </div>

      {numbers.length === 0 && (
        <p className="text-neutral-400">Nenhum número cadastrado ainda.</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {numbers.map((n) => (
          <Link
            key={n.id}
            href={`/${orgSlug}/numeros/${n.id}`}
            className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{n.label}</span>
              <StatusBadge status={n.currentStatus} />
            </div>
            <span className="text-sm text-neutral-400">{n.e164}</span>
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>{PROVIDER_LABELS[n.provider] ?? n.provider}</span>
              <span>score {n.currentScore}</span>
            </div>
          </Link>
        ))}
      </div>

      {canManage && (
        <form
          action={createNumber.bind(null, orgSlug)}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Nome/label</label>
            <input
              name="label"
              required
              className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Número (E.164)</label>
            <input
              name="e164"
              placeholder="+5511999999999"
              required
              className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Origem</label>
            <select
              name="provider"
              className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
            >
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Adicionar número
          </button>
        </form>
      )}
    </div>
  );
}
