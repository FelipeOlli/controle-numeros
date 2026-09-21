"use client";

import { useTransition } from "react";
import { Mail } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setNotifyEnabled, updateNotifyEmail } from "./actions";

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-[14px] bg-row px-4 py-3">
        <span className="text-sm font-semibold text-ink">Ativa</span>
        <Switch
          checked={notifyEnabled}
          disabled={pending}
          onCheckedChange={(checked) => startTransition(() => setNotifyEnabled(checked))}
        />
      </div>

      <form action={updateNotifyEmail} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="type-form-label flex items-center gap-1.5 text-ink-2">
            <Mail size={12} />
            E-mail
          </label>
          <Input
            name="notifyEmail"
            type="email"
            placeholder={`Deixe em branco pra usar ${accountEmail}`}
            defaultValue={notifyEmail ?? ""}
          />
        </div>
        <Button type="submit" variant="pill" size="pill" className="w-fit">
          Salvar
        </Button>
      </form>
    </div>
  );
}
