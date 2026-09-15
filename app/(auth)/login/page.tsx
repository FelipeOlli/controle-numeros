import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Radio, LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

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
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Radio size={18} strokeWidth={2.5} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Controle de Números</h1>
        </div>
        <ThemeToggle />
      </div>

      {convite && (
        <p className="mb-4 text-sm text-muted-foreground">
          Já existe uma conta com esse e-mail. Entre para aceitar o convite.
        </p>
      )}

      <form
        action={login.bind(null, convite)}
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">E-mail ou senha inválidos.</p>
        )}

        <Button type="submit" className="mt-2">
          <LogIn size={16} />
          Entrar
        </Button>
      </form>
    </main>
  );
}
