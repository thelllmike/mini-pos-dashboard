"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/shops", label: "Shops" },
  { href: "/users", label: "Users" },
  { href: "/bills", label: "Bills" },
  { href: "/activity", label: "Activity" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-blue text-white" : "text-text hover:bg-fill"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
