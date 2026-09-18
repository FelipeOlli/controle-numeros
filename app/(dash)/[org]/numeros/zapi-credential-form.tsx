"use client";

import { useState, useTransition } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveZapiCredential, syncZapiNow } from "./actions";

/**
 * Salva o Client-Token da conta Z-API (aba Segurança → "Token de segurança
 * da conta", ex: app.z-api.io/security). Nunca reexibe o valor salvo — só
 * mostra se já está configurado, igual qualquer campo de senha.
 */
export function ZapiCredentialForm({
  orgSlug,
  configured,
}: {
  orgSlug: string;
  configured: boolean;
}) {
  const [savePending, startSave] = useTransition();
  const [syncPending, startSync] = useTransition();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-[22px_24px]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
          <KeyRound size={16} />
        </span>
        <div>
          <span className="type-card-title-sm block">Integração Z-API</span>
          <span className="type-meta text-ink-3">
            {configured
              ? "Client-Token configurado — sincroniza o status de conexão de cada número."
              : "Cole o Client-Token da conta (Z-API → Segurança → \"Token de segurança da conta\")."}
          </span>
        </div>
      </div>

      <form
        action={(formData) => startSave(() => saveZapiCredential(orgSlug, formData))}
        className="flex flex-col gap-2.5 min-[600px]:flex-row"
      >
        <Input
          name="clientToken"
          type="password"
          required
          placeholder={configured ? "•••••••••••••• (trocar)" : "Client-Token"}
          className="flex-1"
        />
        <Button type="submit" variant="pill" size="pill-sm" disabled={savePending}>
          Salvar
        </Button>
      </form>

      {configured && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-line-2 pt-3">
          <Button
            type="button"
            variant="pill-ghost"
            size="pill-sm"
            disabled={syncPending}
            onClick={() =>
              startSync(async () => {
                setSyncMessage(null);
                const result = await syncZapiNow(orgSlug);
                setSyncMessage(
                  result.error
                    ? result.error
                    : `${result.checked} número(s) verificado(s) · ${result.statusChanged} mudou(ram) de status`,
                );
              })
            }
          >
            <RefreshCw size={13} className={syncPending ? "animate-spin" : undefined} />
            Sincronizar agora
          </Button>
          {syncMessage && <span className="type-meta text-ink-3">{syncMessage}</span>}
        </div>
      )}
    </div>
  );
}
