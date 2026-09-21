"use client";

import { useTransition } from "react";
import { BatteryCharging, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CARRIER_LABELS } from "@/lib/providers";
import { updateRecharge, quickRecharge } from "./actions";
import type { Carrier } from "@/generated/prisma/enums";

const selectClass =
  "w-full rounded-[14px] border border-line bg-canvas px-[14px] py-3 text-[15px] text-ink outline-none focus:border-accent focus:bg-surface";

/**
 * Sem crédito a cada ~3 meses, a operadora recolhe o chip físico. Guarda
 * operadora + datas manualmente, e um botão de um clique que já marca hoje
 * como última recarga e soma 90 dias pra próxima.
 */
export function RechargeForm({
  orgSlug,
  numberId,
  carrier,
  lastRechargeAt,
  nextRechargeAt,
}: {
  orgSlug: string;
  numberId: string;
  carrier: Carrier | null;
  lastRechargeAt: Date | null;
  nextRechargeAt: Date | null;
}) {
  const [savePending, startSave] = useTransition();
  const [quickPending, startQuick] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px]">
      <span className="flex items-center gap-2 type-card-title-sm">
        <BatteryCharging size={16} className="text-accent" />
        Recarga (chip físico)
      </span>
      <p className="type-meta text-ink-3">
        Sem crédito a cada ~3 meses, a operadora recolhe o número.
      </p>

      <Button
        type="button"
        variant="pill"
        size="pill-sm"
        disabled={quickPending}
        onClick={() => startQuick(() => quickRecharge(orgSlug, numberId))}
        className="w-fit"
      >
        <RefreshCw size={13} className={quickPending ? "animate-spin" : undefined} />
        Recarregar agora
      </Button>

      <form
        action={(formData) => startSave(() => updateRecharge(orgSlug, numberId, formData))}
        className="flex flex-col gap-3 border-t border-line-2 pt-3"
      >
        <div className="flex flex-col gap-1.5">
          <label className="type-form-label text-ink-2">Operadora</label>
          <select name="carrier" defaultValue={carrier ?? ""} className={selectClass}>
            <option value="">Selecione</option>
            {Object.entries(CARRIER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="type-form-label text-ink-2">Última recarga</label>
          <Input
            name="lastRechargeAt"
            type="date"
            defaultValue={lastRechargeAt ? lastRechargeAt.toISOString().slice(0, 10) : ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="type-form-label text-ink-2">Próxima recarga</label>
          <Input
            name="nextRechargeAt"
            type="date"
            defaultValue={nextRechargeAt ? nextRechargeAt.toISOString().slice(0, 10) : ""}
          />
        </div>
        <Button type="submit" variant="pill" size="pill-sm" disabled={savePending} className="w-fit">
          Salvar
        </Button>
      </form>
    </div>
  );
}
