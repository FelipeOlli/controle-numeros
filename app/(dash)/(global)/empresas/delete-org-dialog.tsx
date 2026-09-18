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

const selectClass =
  "rounded-[14px] border border-line bg-canvas px-[14px] py-3 text-[15px] text-ink outline-none focus:border-accent focus:bg-surface";

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
      <button
        type="button"
        aria-label="Excluir empresa"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 transition hover:bg-danger-soft hover:text-danger-deep min-[900px]:h-[30px] min-[900px]:w-[30px]"
      >
        <Trash2 size={14} />
      </button>
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
            <div className="flex flex-col gap-3 rounded-[14px] bg-row p-3.5">
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input
                  type="radio"
                  name="mode"
                  value="migrate"
                  checked={mode === "migrate"}
                  onChange={() => setMode("migrate")}
                  className="accent-accent"
                />
                Migrar os números pra outra empresa (mantém histórico)
              </label>
              {mode === "migrate" && (
                <select name="targetOrgSlug" required className={selectClass}>
                  {otherOrgs.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input
                  type="radio"
                  name="mode"
                  value="delete-numbers"
                  checked={mode === "delete-numbers"}
                  onChange={() => setMode("delete-numbers")}
                  className="accent-danger"
                />
                Excluir os números junto (irreversível)
              </label>
            </div>
          )}

          {hasNumbers && otherOrgs.length === 0 && (
            <>
              <input type="hidden" name="mode" value="delete-numbers" />
              <p className="type-body-sm text-ink-3">
                Você não é OWNER de outra empresa pra migrar — os {numberCount} número
                {numberCount === 1 ? "" : "s"} serão excluídos junto.
              </p>
            </>
          )}

          <Button type="submit" variant="pill" size="pill" className="mt-1 bg-danger text-danger-ink hover:bg-danger-deep">
            <Trash2 size={15} />
            Confirmar exclusão
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
