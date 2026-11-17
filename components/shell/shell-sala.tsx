"use client";

/**
 * Shell da Sala do Cliente — navegação do protótipo ("Meu espaço" / "Conta")
 * mapeada para as rotas REAIS da Sala.
 */

import type { ReactNode } from "react";
import {
  LayoutDashboard, Newspaper, CircleCheckBig, FileText, MessageCircle, LifeBuoy,
} from "lucide-react";
import { ArcheShell, type ShellGroup } from "./arche-shell";

const GROUPS: ShellGroup[] = [
  {
    titulo: "Meu espaço",
    itens: [
      { key: "visao", label: "Visão geral", icon: LayoutDashboard, href: "/sala" },
      { key: "atualizacoes", label: "Atualizações", icon: Newspaper, href: "/sala/atualizacoes" },
      { key: "aprovacoes", label: "Aprovações", icon: CircleCheckBig, href: "/sala/aprovacoes" },
      { key: "documentos", label: "Documentos", icon: FileText, href: "/sala/documentos" },
      { key: "mensagens", label: "Mensagens", icon: MessageCircle, href: "/sala/mensagens" },
    ],
  },
  {
    titulo: "Conta",
    itens: [{ key: "suporte", label: "Suporte", icon: LifeBuoy, href: "/sala/suporte" }],
  },
];

export function ShellSala({
  nome,
  empresa,
  children,
}: {
  nome: string;
  empresa?: string | null;
  children: ReactNode;
}) {
  return (
    <ArcheShell
      area="Sala do cliente"
      groups={GROUPS}
      userName={nome}
      userSub={empresa || undefined}
      logoutPath="/sala/sair"
    >
      {children}
    </ArcheShell>
  );
}
