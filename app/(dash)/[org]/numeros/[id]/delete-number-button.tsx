"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className="text-destructive hover:border-destructive hover:bg-destructive/10"
      onClick={() => {
        if (!confirm(`Excluir "${label}"? Isso apaga todo o histórico de checks e incidentes dele.`)) {
          return;
        }
        startTransition(() => deleteNumber(orgSlug, numberId));
      }}
    >
      <Trash2 size={14} />
      Excluir
    </Button>
  );
}
