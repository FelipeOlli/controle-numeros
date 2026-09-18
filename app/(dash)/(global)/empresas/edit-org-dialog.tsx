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
import { updateOrganization } from "./actions";

export function EditOrgDialog({ orgSlug, name }: { orgSlug: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label="Editar empresa"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 transition hover:bg-pill-hover hover:text-ink min-[900px]:h-[30px] min-[900px]:w-[30px]"
      >
        <Pencil size={14} />
      </button>
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
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Nome da empresa</label>
            <Input name="name" required minLength={2} defaultValue={name} />
          </div>
          <Button type="submit" variant="pill" size="pill" className="mt-1">
            Salvar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
