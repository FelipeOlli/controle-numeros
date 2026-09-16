"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inviteMember } from "./actions";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

export function InviteForm({ orgs }: { orgs: { slug: string; name: string }[] }) {
  return (
    <form action={inviteMember} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">E-mail</label>
        <input name="email" type="email" required className={`w-64 ${inputClass}`} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Empresa</label>
        <select name="orgSlug" required className={inputClass}>
          {orgs.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Papel</label>
        <select name="role" defaultValue="VIEWER" className={inputClass}>
          <option value="VIEWER">Visualizador</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <Button type="submit">
        <UserPlus size={15} />
        Enviar convite
      </Button>
    </form>
  );
}
