import { UserCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { acceptInviteLoggedIn, signupAndAcceptInvite } from "./actions";

const inputClass =
  "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

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
      <main className="m-auto max-w-sm px-6 text-center">
        <h1 className="mb-2 text-lg font-semibold">Convite inválido</h1>
        <p className="text-muted-foreground">
          Este convite não existe mais, já foi usado ou expirou.
        </p>
      </main>
    );
  }

  const alreadyLoggedInAsInvitee = session?.user?.email === invite.email;

  return (
    <main className="m-auto w-full max-w-sm px-6">
      <div className="mb-8 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <UserCheck size={18} strokeWidth={2.5} />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Convite para {invite.org.name}</h1>
          <p className="text-sm text-muted-foreground">
            {invite.email} · papel: {invite.role}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {alreadyLoggedInAsInvitee ? (
          <form action={acceptInviteLoggedIn.bind(null, token)}>
            <button
              type="submit"
              className="w-full rounded-md bg-accent py-2 font-medium text-accent-foreground transition hover:brightness-110"
            >
              Aceitar convite
            </button>
          </form>
        ) : session?.user ? (
          <p className="text-sm text-muted-foreground">
            Você está logado com outra conta. Saia e entre com {invite.email} para aceitar.
          </p>
        ) : (
          <form action={signupAndAcceptInvite.bind(null, token)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <input name="name" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">Senha</label>
              <input
                name="password"
                type="password"
                minLength={8}
                required
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="mt-2 rounded-md bg-accent py-2 font-medium text-accent-foreground transition hover:brightness-110"
            >
              Criar conta e entrar
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
