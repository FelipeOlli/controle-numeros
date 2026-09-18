import { notFound } from "next/navigation";
import Link from "next/link";
import { Radio, LogOut, ChevronLeft } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { OrgSwitcher } from "./org-switcher";
import { GlobalNavLinks } from "../(global)/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileTabbar } from "@/components/mobile-tabbar";
import { Button } from "@/components/ui/button";

export default async function DashLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org: orgSlug } = await params;
  const session = await auth();

  const membership = session?.memberships.find((m) => m.orgSlug === orgSlug);
  if (!session?.user || !membership) {
    notFound();
  }

  const initials = (session.user.email ?? "??").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-full flex-1 justify-center bg-shell min-[900px]:p-[18px]">
      <div className="flex min-h-full w-full max-w-[1280px] flex-col bg-canvas min-[900px]:rounded-[24px] min-[900px]:shadow-xl">
        <header className="flex items-center gap-3 px-5 py-4 min-[900px]:gap-4 min-[900px]:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-2 overflow-hidden type-nav">
            <Link
              href="/painel"
              className="flex items-center gap-2 text-ink-2 transition hover:text-ink min-[900px]:hidden"
              aria-label="Voltar ao painel"
            >
              <ChevronLeft size={18} />
            </Link>
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink">
                <Radio size={15} strokeWidth={2.3} />
              </span>
              <span className="max-w-[160px] truncate font-bold text-ink">{membership.orgName}</span>
            </span>
          </div>

          <div className="flex min-w-0 flex-1 justify-center overflow-x-auto">
            <GlobalNavLinks />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <OrgSwitcher current={orgSlug} orgs={session.memberships} />
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
