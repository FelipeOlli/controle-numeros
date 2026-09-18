"use client";

import { useState, useTransition } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { deleteNumber } from "../actions";

export function DeleteNumberButton({
  orgSlug,
  numberId,
  label,
}: {
  orgSlug: string;
  numberId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="pill-ghost"
        size="pill-sm"
        className="text-danger-deep hover:bg-danger-soft"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={14} />
        Excluir
      </Button>
      <DialogContent>
        <DialogHeader className="items-center text-center sm:items-center sm:text-center">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-danger-soft text-danger-deep">
            <TriangleAlert size={20} />
          </span>
          <DialogTitle>Excluir {label}?</DialogTitle>
          <DialogDescription>
            Isso apaga todo o histórico de checks e incidentes dele. Não pode ser desfeito.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2.5 min-[500px]:flex-row min-[500px]:justify-center">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending}
            className="rounded-full bg-danger text-danger-ink hover:bg-danger-deep"
            onClick={() => {
              startTransition(() => deleteNumber(orgSlug, numberId));
              setOpen(false);
            }}
          >
            <Trash2 size={15} />
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
