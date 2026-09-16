"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createChannel } from "./actions";

type Kind = "EMAIL" | "WEBHOOK" | "WHATSAPP";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export function NewChannelForm({ orgSlug }: { orgSlug: string }) {
  const [kind, setKind] = useState<Kind>("EMAIL");

  return (
    <form action={createChannel.bind(null, orgSlug)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Tipo</label>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className={`w-48 ${inputClass}`}
        >
          <option value="EMAIL">E-mail</option>
          <option value="WEBHOOK">Webhook (n8n)</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        {kind === "EMAIL" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">E-mail</label>
            <input name="to" type="email" required className={`w-80 ${inputClass}`} />
          </div>
        )}

        {kind === "WEBHOOK" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">URL do webhook</label>
            <input name="url" type="url" required className={`w-64 ${inputClass}`} />
          </div>
        )}

        {kind === "WHATSAPP" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">URL de envio (Evolution/Meta)</label>
              <input name="sendUrl" type="url" required className={`w-64 ${inputClass}`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">API key</label>
              <input name="apiKey" required className={`w-64 ${inputClass}`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Número de destino</label>
              <input
                name="to"
                required
                placeholder="+5511999999999"
                className={`w-56 font-mono ${inputClass}`}
              />
            </div>
          </>
        )}
      </div>

      <Button type="submit" className="w-fit">
        <Plus size={15} />
        Adicionar canal
      </Button>
    </form>
  );
}
