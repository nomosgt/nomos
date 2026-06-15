"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/contatos", label: "Contatos" },
  { href: "/admin/simulacoes", label: "Simulações" },
  { href: "/admin/cnpj", label: "CNPJ" },
  { href: "/admin/blog", label: "Blog" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map((it) => {
        const active =
          it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`px-3 py-1.5 text-[12px] font-mono uppercase tracking-[0.2em] rounded-sm transition-colors ${
              active
                ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
// end of AdminNav
