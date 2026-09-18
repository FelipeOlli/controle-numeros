"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMember } from "./actions";

const selectClass =
  "rounded-[14px] border border-line bg-canvas px-[14px] py-3 text-[15px] text-ink outline-none focus:border-accent focus:bg-surface";

export function InviteForm({ orgs }: { orgs: { slug: string; name: string }[] }) {
  return (
    <form action={inviteMember} className="flex flex-col gap-3 min-[700px]:flex-row min-[700px]:items-end">
      <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
        <label className="type-form-label text-ink-2">E-mail</label>
        <Input name="email" type="email" required />
      </div>
      <div className="flex flex-col gap-1.5 min-[700px]:w-[220px]">
        <label className="type-form-label text-ink-2">Empresa</label>
        <select name="orgSlug" required className={selectClass}>
          {orgs.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 min-[700px]:w-[180px]">
        <label className="type-form-label text-ink-2">Papel</label>
        <select name="role" defaultValue="VIEWER" className={selectClass}>
          <option value="VIEWER">Visualizador</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <Button type="submit" variant="pill" size="pill" className="w-full min-[700px]:w-auto">
        <UserPlus size={15} />
        Enviar convite
      </Button>
    </form>
  );
}
