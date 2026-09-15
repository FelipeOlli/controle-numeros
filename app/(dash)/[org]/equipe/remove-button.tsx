"use client";

import { useTransition } from "react";
import { removeMember } from "./actions";

export function RemoveButton({ orgSlug, membershipId }: { orgSlug: string; membershipId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => removeMember(orgSlug, membershipId))}
      className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-red-400 hover:border-red-500 disabled:opacity-50"
    >
      Remover
    </button>
  );
}
