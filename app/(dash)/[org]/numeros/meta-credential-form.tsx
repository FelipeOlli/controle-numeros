"use client";

import { useState, useTransition } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/format";
import { saveMetaCredential, syncMetaNow } from "./actions";

/**
 * Salva o WABA ID e o system user access token da conta Meta Cloud API
 * (Business Settings → Usuários do sistema → gerar token com
 * whatsapp_business_management). O token nunca é reexibido — só o WABA ID,
 * que não é segredo.
 */
export function MetaCredentialForm({
  orgSlug,
  configured,
  wabaId,
  lastSyncAt,
}: {
  orgSlug: string;
  configured: boolean;
  wabaId: string | null;
  lastSyncAt: Date | null;
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
          <span className="type-card-title-sm block">Integração Meta Cloud API</span>
          <span className="type-meta text-ink-3">
            {configured
              ? "Credencial configurada — sincroniza conexão, qualidade e gasto de cada número."
              : "WABA ID e token de sistema (Business Settings → Usuários do sistema)."}
          </span>
        </div>
      </div>

      <form
        action={(formData) => startSave(() => saveMetaCredential(orgSlug, formData))}
        className="flex flex-col gap-2.5 min-[600px]:flex-row"
      >
        <Input
          name="wabaId"
          required
          defaultValue={wabaId ?? ""}
          placeholder="WABA ID"
          className="flex-1"
        />
        <Input
          name="accessToken"
          type="password"
          required
          placeholder={configured ? "•••••••••••••• (trocar)" : "Access token"}
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
                const result = await syncMetaNow(orgSlug);
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
          <span className="type-meta text-ink-3">
            {syncMessage ?? `Última sincronização: ${lastSyncAt ? timeAgo(lastSyncAt) : "nunca"}`}
          </span>
        </div>
      )}
    </div>
  );
}
