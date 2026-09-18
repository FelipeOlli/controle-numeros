"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Smartphone, Building2, BellRing, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/painel", label: "Painel", icon: LayoutGrid },
  { href: "/numeros", label: "Números", icon: Smartphone },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/notificacoes", label: "Alertas", icon: BellRing },
  { href: "/equipe", label: "Equipe", icon: Users },
];

export function MobileTabbar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface px-1.5 pt-2 pb-[22px] min-[900px]:hidden"
      aria-label="Navegação principal"
    >
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/painel" && pathname.startsWith(link.href)) ||
          (link.href === "/numeros" && /^\/[^/]+\/numeros/.test(pathname));
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex h-[52px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] ${
              active ? "text-accent-deep" : "text-ink-3"
            }`}
          >
            <Icon size={22} strokeWidth={2} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
