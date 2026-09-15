"use client";

import { useTransition } from "react";
import { removeMember } from "./actions";

export function RemoveButton({ orgSlug, membershipId }: { orgSlug: string; membershipId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => removeMember(orgSlug, membershipId))}
      className="rounded-md border border-border px-2 py-1 text-xs text-destructive transition hover:border-destructive disabled:opacity-50"
    >
      Remover
    </button>
  );
}
