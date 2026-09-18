"use client";

import { useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { changeRole, removeMember, addAccess, setUserNotify } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  VIEWER: "Visualizador",
};

const selectClass =
  "rounded-full border border-line bg-canvas px-3 py-1.5 text-xs text-ink outline-none focus:border-accent";

interface Access {
  membershipId: string;
  orgSlug: string;
  orgName: string;
  role: string;
}

export function MemberCard({
  userId,
  name,
  email,
  notifyEnabled,
  access,
  availableOrgs,
  isSelf,
}: {
  userId: string;
  name: string;
  email: string;
  notifyEnabled: boolean;
  access: Access[];
  availableOrgs: { slug: string; name: string }[];
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const grantedSlugs = new Set(access.map((a) => a.orgSlug));
  const addableOrgs = availableOrgs.filter((o) => !grantedSlugs.has(o.slug));

  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-row px-4 py-3.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-avatar-bg text-[13px] font-bold text-avatar-ink">
              {(name || email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">{name || email}</div>
            {name && <div className="truncate text-xs text-ink-3">{email}</div>}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-3">
          <span className="hidden min-[500px]:inline">Notificar</span>
          <Switch
            checked={notifyEnabled}
            disabled={pending}
            onCheckedChange={(checked) => startTransition(() => setUserNotify(userId, checked))}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        {access.map((a) => (
          <div
            key={a.membershipId}
            className="flex items-center justify-between gap-2 rounded-full bg-surface px-3 py-1.5"
          >
            <span className="truncate text-xs font-medium text-ink">{a.orgName}</span>
            <div className="flex items-center gap-2">
              <select
                defaultValue={a.role}
                disabled={pending || isSelf}
                className={selectClass}
                onChange={(e) => startTransition(() => changeRole(a.orgSlug, a.membershipId, e.target.value))}
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {!isSelf && (
                <button
                  type="button"
                  disabled={pending}
                  title="Remover acesso"
                  className="text-ink-3 transition hover:text-danger-deep"
                  onClick={() => startTransition(() => removeMember(a.orgSlug, a.membershipId))}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {addableOrgs.length > 0 && (
        <form
          action={(formData) => {
            formData.set("userId", userId);
            startTransition(() => addAccess(formData));
          }}
          className="flex items-center gap-2"
        >
          <select name="orgSlug" required className={selectClass}>
            {addableOrgs.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
          <select name="role" defaultValue="VIEWER" className={selectClass}>
            <option value="VIEWER">Visualizador</option>
            <option value="ADMIN">Admin</option>
            <option value="OWNER">Owner</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1 text-xs text-ink-3 transition hover:text-ink"
          >
            <Plus size={13} />
            Dar acesso
          </button>
        </form>
      )}
    </div>
  );
}
