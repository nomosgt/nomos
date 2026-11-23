"use client";

import { useCallback, useEffect, useState } from "react";
import { Cd, StTag, BtnO, BtnP, fmtData } from "@/components/shell/proto-ui";
import { formatBRL } from "@/lib/utils";

type Est = {
  id: string; client_id: string; cliente: string; titulo: string; descricao: string | null;
  horas: number; valor: number | null; status: string; decidido_em: string | null; criado_em: string;
};
type ClienteOpt = { user_id: string; nome: string; empresa: string | null };

const TONE: Record<string, "ok" | "warn" | "bad" | "info"> = {
  solicitada_cliente: "warn", aguardando_aprovacao: "info", aprovada: "ok", recusada: "bad", cancelada: "bad",
};
const LABEL: Record<string, string> = {
  solicitada_cliente: "Solicitada pelo cliente", aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada", recusada: "Recusada", cancelada: "Cancelada",
};

const inputCls = "w-full rounded-[9px] border border-[#dedbd3] bg-white px-3.5 py-2.5 text-[13.5px] text-[#14173d] outline-none focus:border-[#0f1240]";

export function HorasAdmin() {
  const [ests, setEsts] = useState<Est[] | null>(null);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [agindo, setAgindo] = useState<string | null>(null);
  const [form, setForm] = useState({ client_id: "", titulo: "", descricao: "", horas: "", valor: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await fetch("/api/admin/horas", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao carregar."); setEsts([]); return; }
      setEsts(j.estimativas || []);
      setClientes(j.clientes || []);
    } catch { setErro("Erro de conexão."); setEsts([]); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criar() {
    const horas = Number(form.horas.replace(",", "."));
    if (!form.client_id || form.titulo.trim().length < 3 || !(horas > 0)) {
      alert("Preencha cliente, título e horas (> 0)."); return;
    }
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/horas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: form.client_id, titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || null, horas,
          valor: form.valor.trim() ? Number(form.valor.replace(/\./g, "").replace(",", ".")) : null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha."); return; }
      setForm({ client_id: "", titulo: "", descricao: "", horas: "", valor: "" });
      await carregar();
    } finally { setSalvando(false); }
  }

  async function responder(id: string) {
    const h = prompt("Horas estimadas:");
    if (!h) return;
    const horas = Number(h.replace(",", "."));
    if (!(horas > 0)) { alert("Horas inválidas."); return; }
    const v = prompt("Valor (R$, opcional):") || "";
    setAgindo(id);
    try {
      const r = await fetch("/api/admin/horas", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id, acao: "estimar", horas,
          valor: v.trim() ? Number(v.replace(/\./g, "").replace(",", ".")) : null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha."); return; }
      await carregar();
    } finally { setAgindo(null); }
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar esta estimativa?")) return;
    setAgindo(id);
    try {
      const r = await fetch("/api/admin/horas", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, acao: "cancelar" }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha."); return; }
      await carregar();
    } finally { setAgindo(null); }
  }

  if (ests === null) return <p className="text-[13px] text-[#8a8ca3]">Carregando…</p>;
  if (erro) {
    return (
      <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-5 text-[13.5px] text-rose-800">
        {erro} <button className="ml-2 underline" onClick={() => void carregar()}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Cd title="Nova estimativa para aprovação do cliente">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select className={inputCls} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">Selecione o cliente…</option>
            {clientes.map((c) => (
              <option key={c.user_id} value={c.user_id}>{c.empresa || c.nome}</option>
            ))}
          </select>
          <input className={inputCls} placeholder="Título do trabalho *" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <input className={inputCls} placeholder="Horas *" inputMode="decimal" value={form.horas} onChange={(e) => setForm({ ...form, horas: e.target.value })} />
          <input className={inputCls} placeholder="Valor total (R$, opcional)" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          <textarea className={`${inputCls} md:col-span-2`} rows={2} placeholder="Descrição (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div className="mt-3 flex justify-end">
          <BtnP disabled={salvando} onClick={() => void criar()}>Enviar para aprovação</BtnP>
        </div>
      </Cd>

      <Cd title="Estimativas e aprovações" mono={`${ests.length}`}>
        {ests.length === 0 ? (
          <p className="text-[13px] text-[#8a8ca3]">Nenhuma estimativa ainda.</p>
        ) : (
          <div className="space-y-2.5">
            {ests.map((e) => (
              <div key={e.id} className="rounded-[10px] border border-[#efece6] px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[#0f1240]">{e.titulo}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#8a8ca3]">
                      {e.cliente} · {fmtData(e.criado_em)}
                      {e.status !== "solicitada_cliente" ? ` · ${Number(e.horas)}h` : ""}
                      {e.valor != null ? ` · ${formatBRL(Number(e.valor))}` : ""}
                      {e.decidido_em ? ` · decidida ${fmtData(e.decidido_em)}` : ""}
                    </div>
                  </div>
                  <StTag tone={TONE[e.status] || "info"}>{LABEL[e.status] || e.status}</StTag>
                  {e.status === "solicitada_cliente" && (
                    <BtnP disabled={agindo === e.id} onClick={() => void responder(e.id)}>Responder com estimativa</BtnP>
                  )}
                  {(e.status === "solicitada_cliente" || e.status === "aguardando_aprovacao") && (
                    <BtnO disabled={agindo === e.id} onClick={() => void cancelar(e.id)}>Cancelar</BtnO>
                  )}
                </div>
                {e.descricao && <p className="mt-2 text-[13px] leading-relaxed text-[#6b6e88]">{e.descricao}</p>}
              </div>
            ))}
          </div>
        )}
      </Cd>
    </div>
  );
}
