"use client";

import { useCallback, useEffect, useState } from "react";
import { Cd, StTag, BtnO, BtnP, fmtData } from "@/components/shell/proto-ui";
import { formatBRL } from "@/lib/utils";

type Est = {
  id: string; titulo: string; descricao: string | null; horas: number; valor: number | null;
  status: string; decidido_em: string | null; criado_em: string;
};

const inputCls = "w-full rounded-[9px] border border-[#dedbd3] bg-white px-3.5 py-2.5 text-[13.5px] text-[#14173d] outline-none focus:border-[#0f1240]";

export function HorasSala() {
  const [itens, setItens] = useState<Est[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: "", descricao: "" });
  const [agindo, setAgindo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/sala/horas", { cache: "no-store" });
      const j = await r.json();
      setItens(j.estimativas || []);
      setAviso(j.aviso || null);
    } catch { setItens([]); setAviso("Erro de conexão."); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function solicitar() {
    if (form.titulo.trim().length < 3) { alert("Descreva o trabalho."); return; }
    setSalvando(true);
    try {
      const r = await fetch("/api/sala/horas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: form.titulo.trim(), descricao: form.descricao.trim() || null }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha ao solicitar."); return; }
      setForm({ titulo: "", descricao: "" });
      await carregar();
    } finally { setSalvando(false); }
  }

  async function decidir(id: string, decisao: "aprovada" | "recusada") {
    if (decisao === "aprovada" && !confirm("Aprovar esta estimativa de horas?")) return;
    if (decisao === "recusada" && !confirm("Recusar esta estimativa?")) return;
    setAgindo(id);
    try {
      const r = await fetch("/api/sala/horas", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decisao }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha."); return; }
      await carregar();
    } finally { setAgindo(null); }
  }

  const pendentes = (itens || []).filter((e) => e.status === "aguardando_aprovacao");
  const demais = (itens || []).filter((e) => e.status !== "aguardando_aprovacao");

  return (
    <div className="space-y-5">
      <Cd title="Aguardando sua aprovação" mono={`${pendentes.length}`}>
        {aviso && <p className="mb-3 text-[12.5px] text-amber-700">{aviso}</p>}
        {itens === null ? (
          <p className="text-[13px] text-[#8a8ca3]">Carregando…</p>
        ) : pendentes.length === 0 ? (
          <p className="text-[13px] text-[#8a8ca3]">Nenhuma estimativa pendente.</p>
        ) : (
          <div className="space-y-2.5">
            {pendentes.map((e) => (
              <div key={e.id} className="rounded-[10px] border border-amber-200 bg-amber-50/40 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[#0f1240]">{e.titulo}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#8a8ca3]">
                      {Number(e.horas)}h{e.valor != null ? ` · ${formatBRL(Number(e.valor))}` : ""} · enviada {fmtData(e.criado_em)}
                    </div>
                  </div>
                  <BtnP disabled={agindo === e.id} onClick={() => void decidir(e.id, "aprovada")}>Aprovar</BtnP>
                  <BtnO disabled={agindo === e.id} onClick={() => void decidir(e.id, "recusada")}>Recusar</BtnO>
                </div>
                {e.descricao && <p className="mt-2 text-[13px] leading-relaxed text-[#6b6e88]">{e.descricao}</p>}
              </div>
            ))}
          </div>
        )}
      </Cd>

      <Cd title="Solicitar estimativa de horas">
        <div className="grid grid-cols-1 gap-3">
          <input className={inputCls} placeholder="Qual trabalho você precisa? *" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <textarea className={inputCls} rows={2} placeholder="Contexto (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div className="mt-3 flex justify-end">
          <BtnP disabled={salvando || !!aviso} onClick={() => void solicitar()}>Solicitar à Arché</BtnP>
        </div>
      </Cd>

      {demais.length > 0 && (
        <Cd title="Histórico" mono={`${demais.length}`}>
          <div className="space-y-2">
            {demais.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 border-b border-[#f1eee8] pb-2 last:border-0">
                <div className="min-w-0 flex-1 truncate text-[13px] text-[#14173d]">{e.titulo}</div>
                <span className="font-mono text-[11px] text-[#8a8ca3]">
                  {e.status === "solicitada_cliente" ? "em análise pela Arché" : `${Number(e.horas)}h`}
                  {e.valor != null ? ` · ${formatBRL(Number(e.valor))}` : ""}
                </span>
                <StTag tone={e.status === "aprovada" ? "ok" : e.status === "recusada" || e.status === "cancelada" ? "bad" : "warn"}>
                  {e.status.replace(/_/g, " ")}
                </StTag>
              </div>
            ))}
          </div>
        </Cd>
      )}
    </div>
  );
}
