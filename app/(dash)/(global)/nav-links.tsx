"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Smartphone, Building2, BellRing, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/painel", label: "Números", icon: Smartphone },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/notificacoes", label: "Notificações", icon: BellRing },
  { href: "/equipe", label: "Equipe", icon: Users },
];

export function GlobalNavLinks() {
  const pathname = usePathname();

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
