"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "SLA Queue" },
  { href: "/pallets", label: "Pallet Board" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex min-w-0 items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-sm px-2 py-2 text-sm font-semibold transition-colors sm:px-3.5 ${
              active
                ? "bg-accent-tint text-accent-tint-text"
                : "text-muted hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
