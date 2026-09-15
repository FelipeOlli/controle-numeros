"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleChannel(orgSlug, channelId, !enabled))}
    >
      {enabled ? "Desativar" : "Ativar"}
    </Button>
  );
}
