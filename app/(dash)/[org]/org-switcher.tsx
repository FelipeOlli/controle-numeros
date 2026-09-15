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
      className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1"
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
