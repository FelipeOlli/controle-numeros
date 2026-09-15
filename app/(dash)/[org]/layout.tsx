import { notFound } from "next/navigation";
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
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold">{membership.orgName}</span>
          <NavLinks orgSlug={orgSlug} />
        </div>

        <div className="flex items-center gap-4 text-sm text-neutral-400">
          <OrgSwitcher current={orgSlug} orgs={session.memberships} />
          <span>{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="hover:text-neutral-100">Sair</button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
