import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { acceptInviteLoggedIn, signupAndAcceptInvite } from "./actions";

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
        <p className="text-neutral-400">
          Este convite não existe mais, já foi usado ou expirou.
        </p>
      </main>
    );
  }

  const alreadyLoggedInAsInvitee = session?.user?.email === invite.email;

  return (
    <main className="m-auto w-full max-w-sm px-6">
      <h1 className="mb-2 text-xl font-semibold">Convite para {invite.org.name}</h1>
      <p className="mb-8 text-sm text-neutral-400">
        {invite.email} · papel: {invite.role}
      </p>

      {alreadyLoggedInAsInvitee ? (
        <form action={acceptInviteLoggedIn.bind(null, token)}>
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-100 py-2 font-medium text-neutral-900 hover:bg-white"
          >
            Aceitar convite
          </button>
        </form>
      ) : session?.user ? (
        <p className="text-sm text-neutral-400">
          Você está logado com outra conta. Saia e entre com {invite.email} para aceitar.
        </p>
      ) : (
        <form action={signupAndAcceptInvite.bind(null, token)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-neutral-400">Nome</label>
            <input
              name="name"
              required
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-neutral-400">Senha</label>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-neutral-100 py-2 font-medium text-neutral-900 hover:bg-white"
          >
            Criar conta e entrar
          </button>
        </form>
      )}
    </main>
  );
}
