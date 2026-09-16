"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PROVIDER_LABELS } from "@/lib/providers";
import { updateNumber } from "./actions";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export function EditNumberDialog({
  orgSlug,
  numberId,
  label,
  e164,
  provider,
}: {
  orgSlug: string;
  numberId: string;
  label: string;
  e164: string;
  provider: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil size={14} />
        Editar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar número</DialogTitle>
          <DialogDescription>
            Corrige o nome, o número ou a origem — útil quando um número físico passa a
            usar a Meta Cloud API, ou vice-versa.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await updateNumber(orgSlug, numberId, formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Nome/label</label>
            <input name="label" required defaultValue={label} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Número (E.164)</label>
            <input
              name="e164"
              required
              defaultValue={e164}
              className={`font-mono ${inputClass}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Origem</label>
            <select name="provider" defaultValue={provider} className={inputClass}>
              {Object.entries(PROVIDER_LABELS).map(([value, providerLabel]) => (
                <option key={value} value={value}>
                  {providerLabel}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="mt-1">
            Salvar alterações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
