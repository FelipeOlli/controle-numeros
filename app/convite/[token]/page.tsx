import { UserCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInviteLoggedIn, signupAndAcceptInvite } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  VIEWER: "Visualizador",
};

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { org: { select: { name: true } } },
  });
  const session = await auth();

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <main className="m-auto flex max-w-sm flex-col items-center gap-3 rounded-[22px] bg-surface p-8 text-center">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-row text-ink-3">
          <UserCheck size={22} />
        </span>
        <h1 className="type-card-title-sm">Convite inválido</h1>
        <p className="type-body-sm text-ink-3">
          Este convite não existe mais, já foi usado ou expirou.
        </p>
      </main>
    );
  }

  const alreadyLoggedInAsInvitee = session?.user?.email === invite.email;

  return (
    <main className="m-auto w-full max-w-sm rounded-[22px] bg-surface p-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
          <UserCheck size={20} strokeWidth={2.3} />
        </span>
        <div>
          <h1 className="type-card-title-sm">Convite para {invite.org.name}</h1>
        </div>
      </div>

      <div className="mb-6 rounded-[14px] bg-row p-4 text-center">
        <p className="type-body-sm text-ink-2">{invite.email}</p>
        <p className="type-meta text-ink-3">
          papel: {ROLE_LABELS[invite.role] ?? invite.role} · expira{" "}
          {invite.expiresAt.toLocaleDateString("pt-BR")}
        </p>
      </div>

      {alreadyLoggedInAsInvitee ? (
        <form action={acceptInviteLoggedIn.bind(null, token)} className="flex gap-2.5">
          <Button
            type="submit"
            variant="pill"
            size="pill"
            className="w-full bg-accent text-accent-ink hover:bg-accent-deep"
          >
            Aceitar convite
          </Button>
        </form>
      ) : session?.user ? (
        <p className="type-body-sm text-center text-ink-3">
          Você está logado com outra conta. Saia e entre com {invite.email} para aceitar.
        </p>
      ) : (
        <form action={signupAndAcceptInvite.bind(null, token)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Nome</label>
            <Input name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="type-form-label text-ink-2">Senha</label>
            <Input name="password" type="password" minLength={8} required />
          </div>
          <Button type="submit" variant="pill" size="pill" className="mt-1">
            Criar conta e entrar
          </Button>
        </form>
      )}
    </main>
  );
}
