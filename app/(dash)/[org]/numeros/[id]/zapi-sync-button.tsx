"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncZapiNumberNow } from "./actions";
import type { ZapiNumberSyncResult } from "@/lib/providers/zapi-sync";

/**
 * Estado da instância como a Z-API acabou de responder — mostrado mesmo
 * quando o status do número não muda, senão o sync só dizia "Sem mudanças"
 * e não dava pra saber se a instância está de pé.
 */
function describeInstance(result: ZapiNumberSyncResult): string {
  if (result.error) return result.error;
  if (!result.connected) return "Desconectado";
  return result.smartphoneConnected ? "Conectado" : "Conectado · celular offline";
}

/** Sincroniza só esse número no Z-API, sem esperar os outros da empresa. */
export function ZapiSyncButton({ orgSlug, numberId }: { orgSlug: string; numberId: string }) {
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
            const result = await syncZapiNumberNow(orgSlug, numberId);
            setMessage(describeInstance(result));
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
