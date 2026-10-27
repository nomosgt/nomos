"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Inbox, Calculator, Building2, Users, UserCheck,
  Handshake, Wallet, FileText, FolderOpen, PenLine, LogOut,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";

/**
 * Admin Arché — sidebar estilo CRM (mesma linguagem da Central do Parceiro).
 */

const GRUPOS: {
  titulo: string;
  itens: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    titulo: "Visão",
    itens: [{ href: "/admin", label: "Visão geral", icon: LayoutDashboard }],
  },
  {
    titulo: "Comercial",
    itens: [
      { href: "/admin/contatos", label: "Contatos", icon: Inbox },
      { href: "/admin/simulacoes", label: "Simulações", icon: Calculator },
      { href: "/admin/cnpj", label: "CNPJ", icon: Building2 },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { href: "/admin/clientes", label: "Clientes", icon: Users },
      { href: "/admin/colaboradores", label: "Colaboradores", icon: UserCheck },
      { href: "/admin/parceiros", label: "Supervisão", icon: Handshake },
      { href: "/admin/arquivos", label: "Arquivos", icon: FolderOpen },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
      { href: "/admin/relatorios", label: "Relatórios", icon: FileText },
      { href: "/admin/blog", label: "Blog", icon: PenLine },
    ],
  },
];

export function AdminSidebar({ nome, role }: { nome: string; role: string }) {
  const path = usePathname();
  return (
    <>
      <div className="mb-8">
        <Logo variant="full" className="h-9 w-auto text-[color:var(--color-paper)]" />
        <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/45">
          Painel administrativo
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            <div className="px-3 mb-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/35">
              {g.titulo}
            </div>
            <div className="space-y-0.5">
              {g.itens.map((it) => {
                const ativo = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-colors ${
                      ativo
                        ? "bg-[color:var(--color-paper)]/12 text-[color:var(--color-paper)]"
                        : "text-[color:var(--color-paper)]/60 hover:bg-[color:var(--color-paper)]/6 hover:text-[color:var(--color-paper)]"
                    }`}
                  >
                    <it.icon className="w-4 h-4 flex-shrink-0" />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 pt-5 border-t border-[color:var(--color-paper)]/10">
        <div className="px-3 text-[12px] text-[color:var(--color-paper)]/70 truncate">{nome}</div>
        <div className="px-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-paper)]/40">{role}</div>
        <form action="/admin/sair" method="POST" className="mt-3">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 text-[13px] text-[color:var(--color-paper)]/50 hover:text-[color:var(--color-paper)] transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </form>
      </div>
    </>
  );
}
