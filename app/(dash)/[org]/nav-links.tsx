"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Smartphone, BellRing, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function NavLinks({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();

  const links: { href: string; label: string; icon: LucideIcon }[] = [
    { href: `/${orgSlug}/numeros`, label: "Números", icon: Smartphone },
    { href: `/${orgSlug}/alertas`, label: "Notificações", icon: BellRing },
    { href: `/${orgSlug}/equipe`, label: "Equipe", icon: Users },
  ];

  return (
    <nav className="flex gap-1 text-sm">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 font-medium text-foreground"
                : "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            }
          >
            <Icon size={15} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
