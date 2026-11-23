"use client";

import { useCallback, useEffect, useState } from "react";
import { Cd, StTag, BtnP, fmtData } from "@/components/shell/proto-ui";

type Indicacao = {
  id: string; empresa: string; contato_nome: string | null; contato_email: string | null;
  contato_telefone: string | null; observacao: string | null; status: string; criado_em: string;
};

const TONE: Record<string, "ok" | "warn" | "bad" | "info"> = {
  recebida: "warn", em_contato: "info", convertida: "ok", descartada: "bad",
};

const inputCls = "w-full rounded-[9px] border border-[#dedbd3] bg-white px-3.5 py-2.5 text-[13.5px] text-[#14173d] outline-none focus:border-[#0f1240]";

export function IndicacoesParceiro() {
  const [itens, setItens] = useState<Indicacao[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [form, setForm] = useState({ empresa: "", contato_nome: "", contato_email: "", contato_telefone: "", observacao: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/parceiros/indicacoes", { cache: "no-store" });
      const j = await r.json();
      setItens(j.indicacoes || []);
      setAviso(j.aviso || null);
    } catch { setItens([]); setAviso("Erro de conexão."); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function indicar() {
    if (form.empresa.trim().length < 2) { alert("Informe a empresa."); return; }
    setSalvando(true);
    try {
      const r = await fetch("/api/parceiros/indicacoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: form.empresa.trim(),
          contato_nome: form.contato_nome.trim() || null,
          contato_email: form.contato_email.trim() || null,
          contato_telefone: form.contato_telefone.trim() || null,
          observacao: form.observacao.trim() || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha ao indicar."); return; }
      setForm({ empresa: "", contato_nome: "", contato_email: "", contato_telefone: "", observacao: "" });
      await carregar();
    } finally { setSalvando(false); }
  }

  return (
    <div className="space-y-5">
      <Cd title="Indicar um cliente">
        {aviso && <p className="mb-3 text-[12.5px] text-amber-700">{aviso}</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className={inputCls} placeholder="Empresa *" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
          <input className={inputCls} placeholder="Nome do contato" value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} />
          <input className={inputCls} type="email" placeholder="E-mail do contato" value={form.contato_email} onChange={(e) => setForm({ ...form, contato_email: e.target.value })} />
          <input className={inputCls} placeholder="Telefone" value={form.contato_telefone} onChange={(e) => setForm({ ...form, contato_telefone: e.target.value })} />
          <textarea className={`${inputCls} md:col-span-2`} rows={2} placeholder="Contexto da indicação (opcional)" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
        </div>
        <div className="mt-3 flex justify-end">
          <BtnP disabled={salvando || !!aviso} onClick={() => void indicar()}>Enviar indicação</BtnP>
        </div>
      </Cd>

      <Cd title="Minhas indicações" mono={itens ? `${itens.length}` : undefined}>
        {itens === null ? (
          <p className="text-[13px] text-[#8a8ca3]">Carregando…</p>
        ) : itens.length === 0 ? (
          <p className="text-[13px] text-[#8a8ca3]">Nenhuma indicação ainda. Indicações convertidas entram na sua parceria.</p>
        ) : (
          <div className="space-y-2.5">
            {itens.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#efece6] px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-[#0f1240]">{i.empresa}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#8a8ca3]">
                    {fmtData(i.criado_em)}
                    {i.contato_nome ? ` · ${i.contato_nome}` : ""}
                  </div>
                </div>
                <StTag tone={TONE[i.status] || "info"}>{i.status.replace("_", " ")}</StTag>
              </div>
            ))}
          </div>
        )}
      </Cd>
    </div>
  );
}
