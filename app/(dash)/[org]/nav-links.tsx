"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();

  const links = [{ href: `/${orgSlug}/numeros`, label: "Números" }];

  return (
    <nav className="type-nav hidden items-center justify-self-center gap-1.5 min-[900px]:flex">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
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
