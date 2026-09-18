"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createChannel } from "./actions";

type Kind = "EMAIL" | "WEBHOOK" | "WHATSAPP";

const selectClass =
  "w-full rounded-[14px] border border-line bg-canvas px-[14px] py-3 text-[15px] text-ink outline-none focus:border-accent focus:bg-surface";

export function NewChannelForm() {
  const [kind, setKind] = useState<Kind>("EMAIL");

  return (
    <form action={createChannel} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="type-form-label text-ink-2">Tipo</label>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className={selectClass}
        >
          <option value="EMAIL">E-mail</option>
          <option value="WEBHOOK">Webhook (n8n)</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </div>

      {kind === "EMAIL" && (
        <div className="flex flex-col gap-1.5">
          <label className="type-form-label text-ink-2">E-mail de destino</label>
          <Input name="to" type="email" required />
        </div>
      )}

      {kind === "WEBHOOK" && (
        <div className="flex flex-col gap-1.5">
          <label className="type-form-label text-ink-2">URL do webhook</label>
          <Input name="url" type="url" required />
        </div>
      )}

      {kind === "WHATSAPP" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">URL de envio (Evolution/Meta)</label>
            <Input name="sendUrl" type="url" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">API key</label>
            <Input name="apiKey" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Número de destino</label>
            <Input name="to" required placeholder="+5511999999999" className="font-mono" />
          </div>
        </>
      )}

      <Button type="submit" variant="pill" size="pill" className="mt-1 w-fit">
        <Plus size={15} />
        Adicionar canal
      </Button>
    </form>
  );
}
