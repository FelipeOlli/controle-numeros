"use client";

import { useTransition } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateZapiBilling } from "./actions";

/**
 * Vencimento e pagamento não têm endpoint na conta Z-API "Cliente" — só dá
 * pra ver no painel web deles. Esse form guarda o que você conferir lá.
 */
export function ZapiBillingForm({
  orgSlug,
  numberId,
  providerDueAt,
  providerPaymentStatus,
}: {
  orgSlug: string;
  numberId: string;
  providerDueAt: Date | null;
  providerPaymentStatus: string | null;
}) {
  const [pending, startTransition] = useTransition();

  const dueValue = providerDueAt ? providerDueAt.toISOString().slice(0, 10) : "";

  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="flex items-center gap-2 type-card-title-sm">
        <CreditCard size={16} className="text-accent" />
        Pagamento (Z-API)
      </span>
      <p className="type-meta text-ink-3">
        Sem endpoint pra isso na conta — confira no painel Z-API e atualize aqui.
      </p>
      <form
        action={(formData) => startTransition(() => updateZapiBilling(orgSlug, numberId, formData))}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <label className="type-form-label text-ink-2">Vencimento</label>
          <Input name="providerDueAt" type="date" defaultValue={dueValue} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="type-form-label text-ink-2">Status de pagamento</label>
          <Input
            name="providerPaymentStatus"
            defaultValue={providerPaymentStatus ?? ""}
            placeholder="Pago, Pendente, Em cancelamento…"
          />
        </div>
        <Button type="submit" variant="pill" size="pill-sm" disabled={pending} className="w-fit">
          Salvar
        </Button>
      </form>
    </div>
  );
}
