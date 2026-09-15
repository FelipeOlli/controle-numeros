"use client";

import { useTransition } from "react";
import { toggleChannel } from "./actions";

export function ToggleButton({
  orgSlug,
  channelId,
  enabled,
}: {
  orgSlug: string;
  channelId: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleChannel(orgSlug, channelId, !enabled))}
      className="rounded-md border border-border px-2 py-1 text-xs text-foreground transition hover:border-accent/50 hover:text-accent disabled:opacity-50"
    >
      {enabled ? "Desativar" : "Ativar"}
    </button>
  );
}
