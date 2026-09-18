"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links: { href: string; label: string }[] = [
  { href: "/painel", label: "Painel" },
  { href: "/numeros", label: "Números" },
  { href: "/empresas", label: "Empresas" },
  { href: "/notificacoes", label: "Alertas" },
  { href: "/equipe", label: "Equipe" },
];

export function GlobalNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="type-nav hidden shrink-0 items-center gap-1.5 min-[900px]:flex">
      {links.map((link) => {
        const active = pathname === link.href || (link.href === "/painel" && pathname === "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-full bg-pill-active px-5 py-2 font-semibold text-pill-active-ink"
                : "rounded-full px-[18px] py-2 text-ink-2 transition-colors duration-150 hover:bg-pill-hover hover:text-ink"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
