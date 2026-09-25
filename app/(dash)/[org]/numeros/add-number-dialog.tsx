"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PlatformCheckboxes } from "@/components/platform-checkboxes";
import { ORIGIN_LABELS, CARRIER_LABELS, CHIP_PLAN_LABELS } from "@/lib/providers";
import { createNumber } from "./actions";
import type { NumberOrigin, NumberPlatform, ChipPlan } from "@/generated/prisma/enums";

const selectClass =
  "rounded-[14px] border border-line bg-canvas px-[14px] py-3 text-[15px] text-ink outline-none focus:border-accent focus:bg-surface";

export function AddNumberDialog({ orgSlug }: { orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<NumberOrigin>("CHIP_FISICO");
  const [platforms, setPlatforms] = useState<NumberPlatform[]>([]);
  const [chipPlan, setChipPlan] = useState<ChipPlan>("PRE_PAGO");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="pill" size="pill" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Adicionar número
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar número</DialogTitle>
          <DialogDescription>
            Cadastra um número de WhatsApp pra monitorar nesta empresa.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createNumber(orgSlug, formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Nome/label</label>
            <Input name="label" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Número (E.164)</label>
            <Input name="e164" placeholder="+5511999999999" required className="font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Origem</label>
            <select
              name="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value as NumberOrigin)}
              className={selectClass}
            >
              {Object.entries(ORIGIN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {origin === "CHIP_FISICO" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="type-form-label text-ink-2">Plano</label>
                <select
                  name="chipPlan"
                  value={chipPlan}
                  onChange={(e) => setChipPlan(e.target.value as ChipPlan)}
                  className={selectClass}
                >
                  {Object.entries(CHIP_PLAN_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="type-form-label text-ink-2">Operadora</label>
                <select name="carrier" defaultValue="" required className={selectClass}>
                  <option value="">Selecione</option>
                  {Object.entries(CARRIER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {chipPlan === "PRE_PAGO" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="type-form-label text-ink-2">Última recarga</label>
                  <Input name="lastRechargeAt" type="date" required />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="type-form-label text-ink-2">Observações</label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Ex.: fatura vence dia 10, titular..."
                    className={`${selectClass} resize-none`}
                  />
                </div>
              )}
            </>
          )}
          <PlatformCheckboxes origin={origin} selected={platforms} onChange={setPlatforms} />
          {platforms.includes("ZAPI") && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="type-form-label text-ink-2">ID (Z-API)</label>
                <Input name="externalId" className="font-mono" placeholder="coluna ID no painel Z-API" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="type-form-label text-ink-2">Token (Z-API)</label>
                <Input
                  name="providerToken"
                  className="font-mono"
                  placeholder="coluna TOKEN no painel Z-API"
                />
              </div>
            </>
          )}
          {platforms.includes("META_CLOUD") && !platforms.includes("ZAPI") && (
            <div className="flex flex-col gap-1.5">
              <label className="type-form-label text-ink-2">ID (Meta)</label>
              <Input
                name="externalId"
                className="font-mono"
                placeholder="phone_number_id no Business Manager"
              />
            </div>
          )}
          <Button type="submit" variant="pill" size="pill" className="mt-1">
            <Plus size={16} />
            Adicionar número
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
