import { Building2 } from "lucide-react";

export default function SemOrganizacao() {
  return (
    <main className="m-auto flex max-w-md flex-col items-center gap-3 rounded-[22px] bg-surface p-8 text-center">
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-row text-ink-3">
        <Building2 size={22} />
      </span>
      <h1 className="type-card-title-sm">Nenhuma organização</h1>
      <p className="type-body-sm text-ink-3">
        Seu usuário ainda não está vinculado a nenhuma empresa. Peça para um administrador te
        convidar.
      </p>
    </main>
  );
}
