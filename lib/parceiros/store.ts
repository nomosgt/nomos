"use client";

/**
 * Portal de Parceiros NGT — camada de dados v1 (localStorage).
 * Repository pattern: trocar por Supabase depois sem tocar na UI.
 */

export type StatusProjeto = "em_andamento" | "aguardando" | "concluido" | "arquivado";
export type StatusTrabalho = "pendente" | "aprovado" | "ressalva" | "reprovado";
export type StatusComissao = "prevista" | "aprovada" | "paga";
export type Prioridade = "alta" | "media" | "baixa";

export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  contato: string;
  email: string;
  telefone: string;
  criado_em: string;
}

export interface Projeto {
  id: string;
  nome: string;
  cliente_id: string;
  etapa: string;
  status: StatusProjeto;
  prioridade: Prioridade;
  vencimento: string | null;
  observacoes: string;
  criado_em: string;
}

export interface Trabalho {
  id: string;
  titulo: string;
  projeto_id: string | null;
  descricao: string;
  fundamentacao: string;
  status: StatusTrabalho;
  ressalva: string;
  criado_em: string;
}

export interface Comissao {
  id: string;
  projeto_id: string | null;
  descricao: string;
  percentual: number;
  valor: number;
  status: StatusComissao;
  data_pagamento: string | null;
  criado_em: string;
}

export interface Documento {
  id: string;
  nome: string;
  tipo: string;
  projeto_id: string | null;
  data_envio: string | null;
  observacoes: string;
  criado_em: string;
}

export interface Relatorio {
  id: string;
  periodo: string;
  resumo: string;
  conteudo: string;
  criado_em: string;
}

export interface DB {
  clientes: Cliente[];
  projetos: Projeto[];
  trabalhos: Trabalho[];
  comissoes: Comissao[];
  documentos: Documento[];
  relatorios: Relatorio[];
}

const KEY = "ngt_parceiros_db_v1";

function emptyDB(): DB {
  return { clientes: [], projetos: [], trabalhos: [], comissoes: [], documentos: [], relatorios: [] };
}

function seedDB(): DB {
  const now = new Date().toISOString();
  const d30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const d7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const c1 = uid();
  const p1 = uid();
  const p2 = uid();
  return {
    clientes: [
      { id: c1, nome: "Exemplo Industria Ltda", documento: "12.345.678/0001-90", contato: "Maria Silva", email: "contato@exemplo.com.br", telefone: "(11) 99999-0000", criado_em: now },
    ],
    projetos: [
      { id: p1, nome: "Recuperacao PIS/COFINS — Tema 69", cliente_id: c1, etapa: "Analise documental", status: "em_andamento", prioridade: "alta", vencimento: d7, observacoes: "Aguardando SPED do cliente.", criado_em: now },
      { id: p2, nome: "Creditos ICMS Energia", cliente_id: c1, etapa: "Peticionamento", status: "aguardando", prioridade: "media", vencimento: d30, observacoes: "", criado_em: now },
    ],
    trabalhos: [
      { id: uid(), titulo: "Memoria de calculo Tema 69", projeto_id: p1, descricao: "Planilha de apuracao 60 meses.", fundamentacao: "RE 574.706 / Tema 69 STF", status: "pendente", ressalva: "", criado_em: now },
    ],
    comissoes: [
      { id: uid(), projeto_id: p1, descricao: "Comissao exito — fase 1", percentual: 10, valor: 25000, status: "prevista", data_pagamento: null, criado_em: now },
    ],
    documentos: [
      { id: uid(), nome: "Contrato de parceria assinado", tipo: "Contrato", projeto_id: null, data_envio: now.slice(0, 10), observacoes: "", criado_em: now },
    ],
    relatorios: [],
  };
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function loadDB(): DB {
  if (typeof window === "undefined") return emptyDB();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded = seedDB();
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    return { ...emptyDB(), ...JSON.parse(raw) };
  } catch {
    return emptyDB();
  }
}

export function saveDB(db: DB) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("[parceiros] persist fail:", e);
  }
}

export function resetDemo() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function diffDays(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 864e5);
}

export function urgencia(iso: string | null): "vencido" | "critico" | "proximo" | "ok" | null {
  const d = diffDays(iso);
  if (d === null) return null;
  if (d < 0) return "vencido";
  if (d <= 3) return "critico";
  if (d <= 10) return "proximo";
  return "ok";
}

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";"),
    ),
  ];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
