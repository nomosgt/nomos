"use client";

/**
 * Shell da Administração — navegação do protótipo mapeada para as rotas REAIS.
 */

import type { ReactNode } from "react";
import {
  LayoutDashboard, Inbox, Calculator, Building2, Users, UserCheck,
  Handshake, Wallet, FileText, FolderOpen, PenLine, ListTodo, Landmark, Globe,
} from "lucide-react";
import { ArcheShell, type ShellGroup } from "./arche-shell";

const GROUPS: ShellGroup[] = [
  {
    titulo: "Gestão",
    itens: [
      { key: "painel", label: "Painel", icon: LayoutDashboard, href: "/admin" },
      { key: "atividades", label: "Atividades", icon: ListTodo, href: "/admin/atividades" },
      { key: "analises", label: "Análises", icon: PenLine, href: "/admin/analises" },
      { key: "colaboradores", label: "Colaboradores", icon: UserCheck, href: "/admin/colaboradores" },
      { key: "supervisao", label: "Central do Parceiro", icon: Handshake, href: "/admin/parceiros" },
    ],
  },
  {
    titulo: "Clientes",
    itens: [
      { key: "clientes", label: "Clientes e acessos", icon: Users, href: "/admin/clientes" },
      { key: "empresas", label: "Empresas", icon: Building2, href: "/admin/empresas" },
      { key: "financeiro", label: "Financeiro", icon: Wallet, href: "/admin/financeiro" },
      { key: "arquivos", label: "Arquivos", icon: FolderOpen, href: "/admin/arquivos" },
    ],
  },
  {
    titulo: "Comercial",
    itens: [
      { key: "contatos", label: "Contatos", icon: Inbox, href: "/admin/contatos" },
      { key: "simulacoes", label: "Simulações", icon: Calculator, href: "/admin/simulacoes" },
      { key: "cnpj", label: "CNPJ", icon: Landmark, href: "/admin/cnpj" },
    ],
  },
  {
    titulo: "Administração",
    itens: [
      { key: "teses", label: "Teses", icon: FileText, href: "/admin/teses" },
      { key: "relatorios", label: "Relatórios", icon: FileText, href: "/admin/relatorios" },
      { key: "blog", label: "Conteúdo do site", icon: Globe, href: "/admin/blog" },
    ],
  },
];

export function ShellAdmin({
  nome,
  role,
  children,
}: {
  nome: string;
  role: string;
  children: ReactNode;
}) {
  return (
    <ArcheShell
      area="Administração"
      groups={GROUPS}
      userName={nome}
      userSub={role}
      logoutPath="/admin/sair"
    >
      {children}
    </ArcheShell>
  );
}
