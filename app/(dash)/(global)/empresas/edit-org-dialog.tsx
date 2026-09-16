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
import { updateOrganization } from "./actions";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export function EditOrgDialog({ orgSlug, name }: { orgSlug: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Pencil size={14} />
        Editar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar empresa</DialogTitle>
          <DialogDescription>
            O link (/{orgSlug}) não muda — só o nome exibido.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await updateOrganization(orgSlug, formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Nome da empresa</label>
            <input name="name" required minLength={2} defaultValue={name} className={inputClass} />
          </div>
          <Button type="submit" className="mt-1">
            Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
