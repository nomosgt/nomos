"use client";

/**
 * Shell da Administração — navegação do protótipo mapeada para as rotas REAIS.
 */

import type { ReactNode } from "react";
import {
  LayoutDashboard, Inbox, Calculator, Building2, Users, UserCheck,
  Handshake, Wallet, FileText, FolderOpen, PenLine, ListTodo, Landmark, Globe,
  Briefcase, Route, CalendarClock, HandCoins, Clock3, KeyRound,
} from "lucide-react";
import { ArcheShell, type ShellGroup } from "./arche-shell";

const GROUPS: ShellGroup[] = [
  {
    titulo: "Gestão",
    itens: [
      { key: "painel", label: "Painel", icon: LayoutDashboard, href: "/admin" },
      { key: "projetos", label: "Projetos", icon: Briefcase, href: "/admin/projetos" },
      { key: "deadline", label: "Deadline", icon: Route, href: "/admin/deadline" },
      { key: "atividades", label: "Demandas", icon: ListTodo, href: "/admin/atividades" },
      { key: "analises", label: "Trabalhos", icon: PenLine, href: "/admin/analises" },
      { key: "indicacoes", label: "Indicações", icon: HandCoins, href: "/admin/indicacoes" },
      { key: "reunioes", label: "Reuniões", icon: CalendarClock, href: "/admin/reunioes" },
    ],
  },
  {
    titulo: "Clientes",
    itens: [
      { key: "clientes", label: "Clientes e acessos", icon: Users, href: "/admin/clientes" },
      { key: "empresas", label: "Empresas", icon: Building2, href: "/admin/empresas" },
      { key: "financeiro", label: "Financeiro", icon: Wallet, href: "/admin/financeiro" },
      { key: "horas", label: "Horas técnicas", icon: Clock3, href: "/admin/horas" },
      { key: "seguranca", label: "Segurança financeira", icon: KeyRound, href: "/admin/seguranca" },
      { key: "colaboradores", label: "Colaboradores", icon: UserCheck, href: "/admin/colaboradores" },
      { key: "supervisao", label: "Portal do parceiro", icon: Handshake, href: "/admin/parceiros" },
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
