import { notFound } from "next/navigation";
import { Radio, LogOut } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { OrgSwitcher } from "./org-switcher";
import { NavLinks } from "./nav-links";

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

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Radio size={16} strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight">{membership.orgName}</span>
          </div>
          <NavLinks orgSlug={orgSlug} />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <OrgSwitcher current={orgSlug} orgs={session.memberships} />
          <span className="hidden font-mono text-xs sm:inline">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-foreground"
              title="Sair"
            >
              <LogOut size={15} />
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
