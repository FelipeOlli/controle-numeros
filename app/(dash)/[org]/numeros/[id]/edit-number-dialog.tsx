"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PROVIDER_LABELS } from "@/lib/providers";
import { updateNumber } from "./actions";

const selectClass =
  "rounded-[14px] border border-line bg-canvas px-[14px] py-3 text-[15px] text-ink outline-none focus:border-accent focus:bg-surface";

export function EditNumberDialog({
  orgSlug,
  numberId,
  label,
  e164,
  provider: initialProvider,
  externalId,
  providerToken,
  movableOrgs,
}: {
  orgSlug: string;
  numberId: string;
  label: string;
  e164: string;
  provider: string;
  externalId: string | null;
  providerToken: string | null;
  /** Empresas (OWNER/ADMIN) pra onde este número pode ser movido, exceto a atual. */
  movableOrgs: { slug: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState(initialProvider);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="pill-ghost" size="pill-sm" onClick={() => setOpen(true)}>
        <Pencil size={14} />
        Editar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar número</DialogTitle>
          <DialogDescription>
            Corrige o nome, o número, a origem — ou move ele pra outra empresa mantendo
            todo o histórico de checks.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await updateNumber(orgSlug, numberId, formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Nome/label</label>
            <Input name="label" required defaultValue={label} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Número (E.164)</label>
            <Input name="e164" required defaultValue={e164} className="font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Origem</label>
            <select
              name="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className={selectClass}
            >
              {Object.entries(PROVIDER_LABELS).map(([value, providerLabel]) => (
                <option key={value} value={value}>
                  {providerLabel}
                </option>
              ))}
            </select>
          </div>
          {provider === "ZAPI" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="type-form-label text-ink-2">ID (Z-API)</label>
                <Input
                  name="externalId"
                  defaultValue={externalId ?? ""}
                  className="font-mono"
                  placeholder="coluna ID no painel Z-API"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="type-form-label text-ink-2">Token (Z-API)</label>
                <Input
                  name="providerToken"
                  defaultValue={providerToken ?? ""}
                  className="font-mono"
                  placeholder="coluna TOKEN no painel Z-API"
                />
              </div>
            </>
          )}
          {movableOrgs.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="type-form-label text-ink-2">Empresa</label>
              <select name="targetOrgSlug" defaultValue={orgSlug} className={selectClass}>
                <option value={orgSlug}>Manter na empresa atual</option>
                {movableOrgs.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    Mover pra {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button type="submit" variant="pill" size="pill" className="mt-1">
            Salvar alterações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
