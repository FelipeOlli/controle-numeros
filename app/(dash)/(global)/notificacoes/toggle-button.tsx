"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleChannel, deleteChannel } from "./actions";

export function ToggleButton({ channelId, enabled }: { channelId: string; enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => toggleChannel(channelId, !enabled))}
      >
        {enabled ? "Desativar" : "Ativar"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        className="text-destructive hover:border-destructive hover:bg-destructive/10"
        onClick={() => {
          if (!confirm("Excluir este canal de notificação?")) return;
          startTransition(() => deleteChannel(channelId));
        }}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
