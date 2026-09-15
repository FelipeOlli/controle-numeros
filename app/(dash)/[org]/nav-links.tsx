"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();

  const links = [
    { href: `/${orgSlug}/numeros`, label: "Números" },
    { href: `/${orgSlug}/alertas`, label: "Alertas" },
    { href: `/${orgSlug}/equipe`, label: "Equipe" },
  ];

  return (
    <nav className="flex gap-4 text-sm">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "font-medium text-neutral-100"
                : "text-neutral-400 hover:text-neutral-100"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
