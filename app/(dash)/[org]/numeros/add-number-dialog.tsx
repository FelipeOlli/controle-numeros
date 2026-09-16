"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PROVIDER_LABELS } from "@/lib/providers";
import { createNumber } from "./actions";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export function AddNumberDialog({ orgSlug }: { orgSlug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
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
          <Button type="submit" className="mt-1">
            <Plus size={16} />
            Adicionar número
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
