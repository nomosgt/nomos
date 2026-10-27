"use client";

/**
 * Portal de Parceiros Arché — camada de dados v1 (localStorage).
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

export interface Andamento {
  id: string;
  texto: string;
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
  /** Andamentos do processo — visíveis p/ admin e supervisão; publicáveis ao cliente. */
  andamentos?: Andamento[];
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
  /** Caminho no Supabase Storage quando o arquivo foi anexado (upload real). */
  storage_path?: string | null;
  arquivo_nome?: string | null;
}

/** Diário de desenvolvimento — registro livre e datado do colaborador. */
export interface DiarioEntry {
  id: string;
  texto: string;
  projeto_id: string | null;
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
  diario?: DiarioEntry[];
}

const KEY = "ngt_parceiros_db_v1";

function emptyDB(): DB {
  return { clientes: [], projetos: [], trabalhos: [], comissoes: [], documentos: [], relatorios: [] };
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function loadDB(): DB {
  if (typeof window === "undefined") return emptyDB();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // Central nasce limpa — nada de dados fictícios; o colaborador começa do zero.
      const vazio = emptyDB();
      localStorage.setItem(KEY, JSON.stringify(vazio));
      return vazio;
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
    schedulePush();
  } catch (e) {
    console.warn("[parceiros] persist fail:", e);
  }
}

/* ============================================================
 * Central v2 — sync com Supabase (via /api/parceiros/dados)
 * - syncFromServer(): baixa o snapshot remoto (fonte da verdade
 *   no login — inclui edições feitas pelo admin) e hidrata o local.
 * - schedulePush(): debounce de 1.2s após cada mutação local.
 * ============================================================ */

export interface CentralPayload {
  nome?: string;
  dados: Partial<DB> | null;
}

/**
 * Busca o payload da Central — o próprio painel do colaborador, hidratado
 * do servidor (fonte da verdade; inclui edições feitas pelo admin).
 * Supervisão é exclusiva do painel admin.
 */
export async function fetchCentral(): Promise<{
  db: DB | null;
  offline: boolean;
}> {
  if (typeof window === "undefined") return { db: null, offline: true };
  try {
    const r = await fetch("/api/parceiros/dados", { cache: "no-store" });
    if (!r.ok) return { db: null, offline: true };
    const j = (await r.json()) as CentralPayload;
    let db: DB | null = null;
    if (j.dados && Array.isArray(j.dados.clientes)) {
      db = { ...emptyDB(), ...j.dados } as DB;
      localStorage.setItem(KEY, JSON.stringify(db));
    } else {
      // primeiro acesso: sobe o estado local (vazio — sem dados fictícios)
      schedulePush();
    }
    return { db, offline: false };
  } catch {
    return { db: null, offline: true };
  }
}

export async function syncFromServer(): Promise<DB | null> {
  const r = await fetchCentral();
  return r.db;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function schedulePush() {
  if (typeof window === "undefined") return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      void fetch("/api/parceiros/dados", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dados: JSON.parse(raw) }),
      }).catch(() => {});
    } catch {
      /* offline ok — localStorage segue como cache */
    }
  }, 1200);
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
