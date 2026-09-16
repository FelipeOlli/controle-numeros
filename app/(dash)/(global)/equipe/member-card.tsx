"use client";

import { useTransition } from "react";
import { Plus, X } from "lucide-react";
import { changeRole, removeMember, addAccess, setUserNotify } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  VIEWER: "Visualizador",
};

const selectClass =
  "rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring";

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
    <li className="flex flex-col gap-3 rounded-md border border-border bg-card p-3.5 text-sm shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-foreground">
            {(name || email).slice(0, 2)}
          </span>
          <div>
            <div className="text-foreground">{name || email}</div>
            {name && <div className="text-xs text-muted-foreground">{email}</div>}
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            defaultChecked={notifyEnabled}
            disabled={pending}
            className="accent-primary"
            onChange={(e) => startTransition(() => setUserNotify(userId, e.target.checked))}
          />
          Notificar por e-mail
        </label>
      </div>

      <ul className="flex flex-col gap-1.5">
        {access.map((a) => (
          <li
            key={a.membershipId}
            className="flex items-center justify-between gap-2 rounded bg-muted px-2 py-1.5"
          >
            <span className="text-xs text-foreground">{a.orgName}</span>
            <div className="flex items-center gap-2">
              <select
                defaultValue={a.role}
                disabled={pending || isSelf}
                className={selectClass}
                onChange={(e) =>
                  startTransition(() => changeRole(a.orgSlug, a.membershipId, e.target.value))
                }
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
                  className="text-muted-foreground transition hover:text-destructive"
                  onClick={() =>
                    startTransition(() => removeMember(a.orgSlug, a.membershipId))
                  }
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

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
            className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <Plus size={13} />
            Dar acesso
          </button>
        </form>
      )}
    </li>
  );
}
