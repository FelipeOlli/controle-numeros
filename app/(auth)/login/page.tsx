import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Radio, LogIn, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <main className="m-auto flex w-full max-w-[980px] flex-col overflow-hidden rounded-[24px] bg-surface shadow-xl min-[700px]:h-[560px] min-[700px]:flex-row">
      <div className="relative flex flex-col gap-6 overflow-hidden bg-accent p-8 text-accent-ink min-[700px]:w-[400px] min-[700px]:p-10">
        <span className="pointer-events-none absolute -right-12 -bottom-16 h-[200px] w-[200px] rounded-full bg-black/10" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <Radio size={20} strokeWidth={2.3} />
        </span>
        <h1 className="relative max-w-[280px] text-[28px] font-bold leading-[1.2] tracking-[-0.02em] min-[700px]:text-[34px]">
          Saiba quais números precisam de atenção antes do cliente ligar.
        </h1>
        <p className="relative max-w-[280px] text-[13px] leading-[1.5] text-white/85">
          Monitore a saúde de todos os seus números de WhatsApp em um só lugar, com alertas
          automáticos na primeira piora.
        </p>
        <div className="relative mt-auto flex flex-wrap gap-2">
          <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">
            Checks manuais e automáticos
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">
            Alertas em tempo real
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5 p-8 min-[700px]:p-10">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">Entrar</h2>

        {convite && (
          <p className="type-body-sm text-ink-3">
            Já existe uma conta com esse e-mail. Entre para aceitar o convite.
          </p>
        )}

        <form action={login.bind(null, convite)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="type-form-label text-ink-2">
              E-mail
            </label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="type-form-label text-ink-2">
                Senha
              </label>
              <a href="#" className="text-xs font-semibold text-accent-link hover:text-ink">
                Esqueci a senha
              </a>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              aria-invalid={Boolean(error)}
              className={error ? "border-[1.5px] border-[#E07A55] bg-danger-soft" : undefined}
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-danger-deep">
              <TriangleAlert size={14} />
              E-mail ou senha inválidos.
            </p>
          )}

          <Button
            type="submit"
            className="mt-1 rounded-full bg-pill-active py-3 text-[15px] font-bold text-pill-active-ink hover:bg-accent"
          >
            <LogIn size={16} />
            Entrar
          </Button>
        </form>

        <p className="text-center text-[11px] text-ink-3">Controle de Números · acesso restrito</p>
      </div>
    </main>
  );
}
