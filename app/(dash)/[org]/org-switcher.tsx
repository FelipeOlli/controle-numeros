"use client";

import { useRouter } from "next/navigation";

interface Org {
  orgSlug: string;
  orgName: string;
}

export function OrgSwitcher({ current, orgs }: { current: string; orgs: Org[] }) {
  const router = useRouter();

  if (orgs.length <= 1) return null;

  return (
    <select
      defaultValue={current}
      className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-ink outline-none focus:border-accent"
      onChange={(e) => router.push(`/${e.target.value}/numeros`)}
    >
      {orgs.map((o) => (
        <option key={o.orgSlug} value={o.orgSlug}>
          {o.orgName}
        </option>
      ))}
    </select>
  );
}
