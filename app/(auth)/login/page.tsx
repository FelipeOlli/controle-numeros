import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

async function login(convite: string | undefined, formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = convite ? `/convite/${convite}` : "/";

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (err) {
    if (err instanceof AuthError) {
      const suffix = convite ? `&convite=${convite}` : "";
      redirect(`/login?error=1${suffix}`);
    }
    throw err;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; convite?: string }>;
}) {
  const { error, convite } = await searchParams;

  return (
    <main className="m-auto w-full max-w-sm px-6">
      <h1 className="mb-8 text-xl font-semibold">Controle de Números</h1>

      {convite && (
        <p className="mb-4 text-sm text-neutral-400">
          Já existe uma conta com esse e-mail. Entre para aceitar o convite.
        </p>
      )}

      <form action={login.bind(null, convite)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm text-neutral-400">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-neutral-400">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-400"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400">E-mail ou senha inválidos.</p>
        )}

        <button
          type="submit"
          className="mt-2 rounded-md bg-neutral-100 py-2 font-medium text-neutral-900 hover:bg-white"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
