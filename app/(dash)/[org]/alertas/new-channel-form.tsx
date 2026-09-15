"use client";

import { useState } from "react";
import { createChannel } from "./actions";

type Kind = "EMAIL" | "WEBHOOK" | "WHATSAPP";

const inputClass =
  "rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400";

export function NewChannelForm({ orgSlug }: { orgSlug: string }) {
  const [kind, setKind] = useState<Kind>("EMAIL");

  return (
    <form action={createChannel.bind(null, orgSlug)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-400">Tipo</label>
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
            <label className="text-xs text-neutral-400">E-mail</label>
            <input name="to" type="email" required className={inputClass} />
          </div>
        )}

        {kind === "WEBHOOK" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">URL do webhook</label>
            <input name="url" type="url" required className={`w-64 ${inputClass}`} />
          </div>
        )}

        {kind === "WHATSAPP" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">URL de envio (Evolution/Meta)</label>
              <input name="sendUrl" type="url" required className={`w-64 ${inputClass}`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">API key</label>
              <input name="apiKey" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Número de destino</label>
              <input name="to" required placeholder="+5511999999999" className={inputClass} />
            </div>
          </>
        )}
      </div>

      <button
        type="submit"
        className="w-fit rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
      >
        Adicionar canal
      </button>
    </form>
  );
}
