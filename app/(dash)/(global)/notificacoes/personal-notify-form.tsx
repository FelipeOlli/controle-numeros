"use client";

import { useTransition } from "react";
import { Mail } from "lucide-react";
import { setNotifyEnabled, updateNotifyEmail } from "./actions";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export function PersonalNotifyForm({
  notifyEnabled,
  notifyEmail,
  accountEmail,
}: {
  notifyEnabled: boolean;
  notifyEmail: string | null;
  accountEmail: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          defaultChecked={notifyEnabled}
          disabled={pending}
          className="accent-primary"
          onChange={(e) => startTransition(() => setNotifyEnabled(e.target.checked))}
        />
        Quero receber notificações por e-mail quando um número piorar
      </label>

      <form action={updateNotifyEmail} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Mail size={12} />
            E-mail (deixe em branco pra usar {accountEmail})
          </label>
          <input
            name="notifyEmail"
            type="email"
            placeholder={accountEmail}
            defaultValue={notifyEmail ?? ""}
            className={`w-80 ${inputClass}`}
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition hover:bg-muted"
        >
          Salvar e-mail
        </button>
      </form>
    </div>
  );
}
