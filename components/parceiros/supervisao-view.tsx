"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Eye, LogOut, ChevronDown, FolderKanban, ClipboardCheck,
  MessageSquareText, Users, Clock,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import type { ColaboradorSupervisao } from "@/lib/parceiros/store";

/**
 * Modo Supervisão (Dra. Gabriela) — visão de TODOS os colaboradores:
 * carteira, projetos, demandas e andamentos de processo.
 * Por regra de acesso, NENHUM dado financeiro chega a esta tela
 * (o servidor remove comissões e valores antes de responder).
 */

interface Props {
  nome: string;
  colaboradores: ColaboradorSupervisao[];
  logout: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  em_andamento: "Em andamento",
  aguardando: "Aguardando",
  concluido: "Concluído",
  arquivado: "Arquivado",
  pendente: "Pendente",
  aprovado: "Aprovado",
  ressalva: "Ressalva",
  reprovado: "Reprovado",
};

function fmtDT(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

export function SupervisaoView({ nome, colaboradores, logout }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);

  const totProjetos = colaboradores.reduce(
    (s, c) => s + (c.dados?.projetos?.length ?? 0), 0);
  const totDemandas = colaboradores.reduce(
    (s, c) => s + (c.dados?.trabalhos?.filter((t) => t.status === "pendente").length ?? 0), 0);
  const totAndamentos = colaboradores.reduce(
    (s, c) => s + (c.dados?.projetos?.reduce((a, p) => a + (p.andamentos?.length ?? 0), 0) ?? 0), 0);

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      {/* Header supervisão */}
      <header className="bg-[color:var(--color-ink)] text-[color:var(--color-paper)]">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo variant="full" className="h-9 w-auto text-[color:var(--color-paper)]" />
            <div className="hidden sm:block h-8 w-px bg-[color:var(--color-paper)]/20" />
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-accent-soft)]">
                <Eye className="w-3.5 h-3.5" /> Supervisão de processos
              </div>
              <div className="text-[13px] text-[color:var(--color-paper)]/70 mt-0.5">{nome}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-[12px] text-[color:var(--color-paper)]/60 hover:text-[color:var(--color-paper)] transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* KPIs — sem financeiro, por regra de acesso */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)] mb-10">
          {[
            [String(colaboradores.length), "Colaboradores", Users],
            [String(totProjetos), "Projetos em carteira", FolderKanban],
            [String(totDemandas), "Demandas pendentes", ClipboardCheck],
            [String(totAndamentos), "Andamentos registrados", MessageSquareText],
          ].map(([v, l, Icon]) => {
            const I = Icon as React.ComponentType<{ className?: string }>;
            return (
              <div key={l as string} className="bg-[color:var(--color-background)] p-6">
                <I className="w-4 h-4 text-[color:var(--color-brand)] mb-3" />
                <div className="font-serif text-3xl tabular-nums text-[color:var(--color-ink)]">{v as string}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)]">{l as string}</div>
              </div>
            );
          })}
        </div>

        <p className="text-[12px] text-[color:var(--color-ink-faint)] mb-6">
          Perfil de supervisão: acompanhamento integral de processos e desenvolvimento.
          Informações financeiras não são exibidas neste perfil.
        </p>

        {/* Colaboradores */}
        <div className="space-y-3">
          {colaboradores.map((c, i) => {
            const open = aberto === c.id;
            const projetos = c.dados?.projetos ?? [];
            const trabalhos = c.dados?.trabalhos ?? [];
            const clientes = c.dados?.clientes ?? [];
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="border border-[color:var(--color-hairline)] bg-[color:var(--color-background)]"
              >
                <button
                  onClick={() => setAberto(open ? null : c.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[color:var(--color-paper-warm)] transition-colors"
                >
                  <div>
                    <div className="font-serif text-[17px] text-[color:var(--color-ink)]">
                      {c.nome}
                      {!c.ativo && (
                        <span className="ml-2 font-mono text-[10px] uppercase text-red-700">inativo</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[color:var(--color-ink-muted)] mt-0.5">
                      {clientes.length} cliente(s) · {projetos.length} projeto(s) ·{" "}
                      {trabalhos.filter((t) => t.status === "pendente").length} demanda(s) pendente(s)
                      <span className="ml-2 text-[color:var(--color-ink-faint)]">
                        <Clock className="w-3 h-3 inline mr-1" />
                        último acesso {fmtDT(c.ultimo_acesso)}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[color:var(--color-ink-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="border-t border-[color:var(--color-hairline)] px-5 py-5 space-y-5">
                    {projetos.length === 0 && (
                      <p className="text-[13px] text-[color:var(--color-ink-faint)]">
                        Nenhum projeto sincronizado ainda.
                      </p>
                    )}
                    {projetos.map((p) => (
                      <div key={p.id} className="border border-[color:var(--color-hairline)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div className="font-medium text-[14px] text-[color:var(--color-ink)]">{p.nome}</div>
                          <span className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)]">
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[color:var(--color-ink-muted)]">
                          {p.etapa || "—"} · vence {p.vencimento ? fmtDT(p.vencimento) : "—"}
                        </div>
                        {(p.andamentos?.length ?? 0) > 0 && (
                          <div className="mt-3 border-l-2 border-[color:var(--color-brand)]/30 pl-3 space-y-2">
                            {p.andamentos!.slice(-5).reverse().map((a) => (
                              <div key={a.id} className="text-[12px] leading-relaxed text-[color:var(--color-ink)]">
                                <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)] mr-2">
                                  {fmtDT(a.criado_em)}
                                </span>
                                {a.texto}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {trabalhos.length > 0 && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
                          Demandas
                        </div>
                        {trabalhos.map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                            <span className="text-[color:var(--color-ink)]">{t.titulo}</span>
                            <span className="font-mono text-[10px] uppercase text-[color:var(--color-ink-muted)]">
                              {STATUS_LABEL[t.status] ?? t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
