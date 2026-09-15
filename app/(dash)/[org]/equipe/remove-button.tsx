"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeMember } from "./actions";

export function RemoveButton({ orgSlug, membershipId }: { orgSlug: string; membershipId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => removeMember(orgSlug, membershipId))}
      className="text-destructive hover:border-destructive hover:bg-destructive/10"
    >
      Remover
    </Button>
  );
}
