"use client";

import { useCallback, useEffect, useState } from "react";
import { Cd, StTag, BtnP, fmtData } from "@/components/shell/proto-ui";

type Reuniao = {
  id: string; titulo: string; detalhes: string | null; data_sugerida: string | null;
  data_confirmada: string | null; status: string; criado_em: string;
};

const inputCls = "w-full rounded-[9px] border border-[#dedbd3] bg-white px-3.5 py-2.5 text-[13.5px] text-[#14173d] outline-none focus:border-[#0f1240]";

export function ReunioesSala() {
  const [itens, setItens] = useState<Reuniao[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: "", detalhes: "", data: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/sala/reunioes", { cache: "no-store" });
      const j = await r.json();
      setItens(j.reunioes || []);
      setAviso(j.aviso || null);
    } catch { setItens([]); setAviso("Erro de conexão."); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function solicitar() {
    if (form.titulo.trim().length < 3) { alert("Descreva o assunto da reunião."); return; }
    setSalvando(true);
    try {
      const r = await fetch("/api/sala/reunioes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          detalhes: form.detalhes.trim() || null,
          data_sugerida: form.data ? new Date(form.data).toISOString() : null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha ao solicitar."); return; }
      setForm({ titulo: "", detalhes: "", data: "" });
      await carregar();
    } finally { setSalvando(false); }
  }

  return (
    <div className="space-y-5">
      <Cd title="Solicitar reunião">
        {aviso && <p className="mb-3 text-[12.5px] text-amber-700">{aviso}</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className={inputCls} placeholder="Assunto *" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <input className={inputCls} type="datetime-local" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          <textarea className={`${inputCls} md:col-span-2`} rows={2} placeholder="Detalhes (opcional)" value={form.detalhes} onChange={(e) => setForm({ ...form, detalhes: e.target.value })} />
        </div>
        <div className="mt-3 flex justify-end">
          <BtnP disabled={salvando || !!aviso} onClick={() => void solicitar()}>Solicitar reunião</BtnP>
        </div>
      </Cd>

      <Cd title="Suas reuniões" mono={itens ? `${itens.length}` : undefined}>
        {itens === null ? (
          <p className="text-[13px] text-[#8a8ca3]">Carregando…</p>
        ) : itens.length === 0 ? (
          <p className="text-[13px] text-[#8a8ca3]">Nenhuma reunião solicitada ainda.</p>
        ) : (
          <div className="space-y-2.5">
            {itens.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#efece6] px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-[#0f1240]">{r.titulo}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#8a8ca3]">
                    pedida em {fmtData(r.criado_em)}
                    {r.data_sugerida ? ` · sugerida ${fmtData(r.data_sugerida, true)}` : ""}
                    {r.data_confirmada ? ` · confirmada ${fmtData(r.data_confirmada, true)}` : ""}
                  </div>
                </div>
                <StTag tone={r.status === "confirmada" ? "ok" : r.status === "cancelada" ? "bad" : r.status === "concluida" ? "info" : "warn"}>
                  {r.status}
                </StTag>
              </div>
            ))}
          </div>
        )}
      </Cd>
    </div>
  );
}
