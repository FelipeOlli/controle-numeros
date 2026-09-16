import { redirect } from "next/navigation";
import { Radio, LogOut } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { GlobalNavLinks } from "./nav-links";

export default async function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Radio size={16} strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight">Controle de Números</span>
          </div>
          <GlobalNavLinks />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <ThemeToggle />
          <span className="hidden font-mono text-xs sm:inline">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm" title="Sair">
              <LogOut size={15} />
              Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
