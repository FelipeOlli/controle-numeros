"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUALITY_LABELS } from "@/lib/providers";
import { syncMetaNumberNow } from "./actions";
import type { MetaNumberSyncResult } from "@/lib/providers/meta-sync";

/** Status + qualidade como a Graph API acabou de responder. */
function describeStatus(result: MetaNumberSyncResult): string {
  if (result.error) return result.error;
  const quality = result.qualityRating ? QUALITY_LABELS[result.qualityRating] : null;
  return quality ? `${result.status} · ${quality}` : (result.status ?? "Sincronizado");
}

/** Sincroniza status/qualidade só desse número, sem esperar os outros da empresa. */
export function MetaSyncButton({ orgSlug, numberId }: { orgSlug: string; numberId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="pill-ghost"
        size="pill-sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await syncMetaNumberNow(orgSlug, numberId);
            setMessage(describeStatus(result));
          })
        }
      >
        <RefreshCw size={13} className={pending ? "animate-spin" : undefined} />
        Sincronizar
      </Button>
      {message && <span className="type-meta text-ink-3">{message}</span>}
    </div>
  );
}
