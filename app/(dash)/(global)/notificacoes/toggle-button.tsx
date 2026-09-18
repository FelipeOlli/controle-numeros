"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toggleChannel, deleteChannel } from "./actions";

export function ToggleButton({ channelId, enabled }: { channelId: string; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={enabled}
        disabled={pending}
        onCheckedChange={(checked) => startTransition(() => toggleChannel(channelId, checked))}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <button
          type="button"
          disabled={pending}
          aria-label="Excluir canal"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition hover:bg-danger-soft hover:text-danger-deep min-[900px]:h-[30px] min-[900px]:w-[30px]"
        >
          <Trash2 size={14} />
        </button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir este canal?</DialogTitle>
            <DialogDescription>Ele deixa de disparar em qualquer empresa. Não pode ser desfeito.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 min-[500px]:flex-row min-[500px]:justify-end">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-full bg-danger text-danger-ink hover:bg-danger-deep"
              onClick={() => {
                startTransition(() => deleteChannel(channelId));
                setOpen(false);
              }}
            >
              <Trash2 size={15} />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
