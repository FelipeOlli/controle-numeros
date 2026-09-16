"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { deleteOrganization } from "./actions";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

type Mode = "migrate" | "delete-numbers";

export function DeleteOrgDialog({
  orgSlug,
  name,
  numberCount,
  otherOrgs,
}: {
  orgSlug: string;
  name: string;
  numberCount: number;
  otherOrgs: { slug: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("migrate");

  const hasNumbers = numberCount > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive hover:border-destructive hover:bg-destructive/10"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Trash2 size={14} />
        Excluir
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {name}</DialogTitle>
          <DialogDescription>
            {hasNumbers
              ? `Essa empresa tem ${numberCount} número${numberCount === 1 ? "" : "s"} vinculado${numberCount === 1 ? "" : "s"}. Escolha o que fazer com eles antes de excluir.`
              : "Essa empresa não tem números vinculados. A exclusão não pode ser desfeita."}
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await deleteOrganization(orgSlug, formData);
          }}
          className="flex flex-col gap-4"
        >
          {hasNumbers && otherOrgs.length > 0 && (
            <div className="flex flex-col gap-3 rounded-md border border-border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  value="migrate"
                  checked={mode === "migrate"}
                  onChange={() => setMode("migrate")}
                  className="accent-primary"
                />
                Migrar os números pra outra empresa (mantém histórico)
              </label>
              {mode === "migrate" && (
                <select name="targetOrgSlug" required className={inputClass}>
                  {otherOrgs.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  value="delete-numbers"
                  checked={mode === "delete-numbers"}
                  onChange={() => setMode("delete-numbers")}
                  className="accent-destructive"
                />
                Excluir os números junto (irreversível)
              </label>
            </div>
          )}

          {hasNumbers && otherOrgs.length === 0 && (
            <>
              <input type="hidden" name="mode" value="delete-numbers" />
              <p className="text-sm text-muted-foreground">
                Você não é OWNER de outra empresa pra migrar — os {numberCount} número
                {numberCount === 1 ? "" : "s"} serão excluídos junto.
              </p>
            </>
          )}

          <Button type="submit" variant="destructive" className="mt-1">
            <Trash2 size={15} />
            Confirmar exclusão
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
