"use client";

import { useTransition } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveZapiCredential } from "./actions";

/**
 * Salva o Partner-Token da conta Z-API. Nunca reexibe o valor salvo — só
 * mostra se já está configurado, igual qualquer campo de senha.
 */
export function ZapiCredentialForm({
  orgSlug,
  configured,
}: {
  orgSlug: string;
  configured: boolean;
}) {
  const [pending, startTransition] = useTransition();

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
              ? "Partner-Token configurado — sincroniza conexão, pagamento e vencimento."
              : "Cole o Partner-Token (programa Parceiro Integrador) pra sincronizar automaticamente."}
          </span>
        </div>
      </div>
      <form
        action={(formData) => startTransition(() => saveZapiCredential(orgSlug, formData))}
        className="flex flex-col gap-2.5 min-[600px]:flex-row"
      >
        <Input
          name="partnerToken"
          type="password"
          required
          placeholder={configured ? "•••••••••••••• (trocar)" : "Partner-Token"}
          className="flex-1"
        />
        <Button type="submit" variant="pill" size="pill-sm" disabled={pending}>
          Salvar
        </Button>
      </form>
    </div>
  );
}
