import { redirect } from "next/navigation";
import Link from "next/link";
import { Radio, Search, LogOut } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileTabbar } from "@/components/mobile-tabbar";
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

  const initials = (session.user.email ?? "??").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-full flex-1 justify-center bg-shell min-[900px]:p-[18px]">
      <div className="flex min-h-full w-full max-w-[1280px] flex-col bg-canvas min-[900px]:rounded-[24px] min-[900px]:shadow-xl">
        <header className="flex items-center gap-3 px-5 py-4 min-[900px]:gap-4 min-[900px]:px-6">
          <Link href="/painel" className="flex shrink-0 items-center gap-2">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-accent text-accent-ink">
              <Radio size={15} strokeWidth={2.3} />
            </span>
            <span className="type-card-title-sm hidden sm:inline">Controle de Números</span>
          </Link>

          <div className="flex min-w-0 flex-1 justify-center overflow-x-auto">
            <GlobalNavLinks />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden rounded-full text-ink-2 hover:bg-pill-hover hover:text-ink min-[900px]:inline-flex"
              aria-label="Buscar"
            >
              <Search size={16} />
            </Button>
            <ThemeToggle />
            <span className="hidden font-mono text-xs text-ink-3 min-[1100px]:inline">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                title="Sair"
                className="rounded-full text-ink-2 hover:bg-pill-hover hover:text-ink"
              >
                <LogOut size={15} />
              </Button>
            </form>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-avatar-bg text-[13px] font-bold text-avatar-ink">
              {initials}
            </span>
          </div>
        </header>

        <main className="flex-1 px-5 pb-[100px] min-[900px]:px-6 min-[900px]:pb-8">
          {children}
        </main>
      </div>

      <MobileTabbar />
    </div>
  );
}
