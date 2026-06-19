"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/sala", label: "Painel" },
  { href: "/sala/atualizacoes", label: "Atualizações" },
  { href: "/sala/documentos", label: "Documentos" },
  { href: "/sala/mensagens", label: "Mensagens" },
  { href: "/sala/suporte", label: "Suporte" },
];

export function SalaNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {ITEMS.map((it) => {
        const active =
          it.href === "/sala" ? path === "/sala" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`px-3 py-1.5 text-[12px] font-mono uppercase tracking-[0.2em] rounded-sm transition-colors whitespace-nowrap ${
              active
                ? "bg-[color:var(--color-brand)] text-[color:var(--color-paper)]"
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
// end of SalaNav
