"use client";

import { useCallback, useEffect, useState } from "react";
import { Cd, StTag, BtnO, BtnP, fmtData } from "@/components/shell/proto-ui";

type Indicacao = {
  id: string; parceiro_nome: string | null; empresa: string;
  contato_nome: string | null; contato_email: string | null; contato_telefone: string | null;
  observacao: string | null; status: string; criado_em: string;
};

const TONE: Record<string, "ok" | "warn" | "bad" | "info"> = {
  recebida: "warn", em_contato: "info", convertida: "ok", descartada: "bad",
};

export function IndicacoesAdmin() {
  const [itens, setItens] = useState<Indicacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [agindo, setAgindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await fetch("/api/admin/indicacoes", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao carregar."); setItens([]); return; }
      setItens(j.indicacoes || []);
    } catch { setErro("Erro de conexão."); setItens([]); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function mover(id: string, status: "em_contato" | "convertida" | "descartada") {
    setAgindo(id);
    try {
      const r = await fetch("/api/admin/indicacoes", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha."); return; }
      await carregar();
    } finally { setAgindo(null); }
  }

  if (itens === null) return <p className="text-[13px] text-[#8a8ca3]">Carregando…</p>;
  if (erro) {
    return (
      <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-5 text-[13.5px] text-rose-800">
        {erro} <button className="ml-2 underline" onClick={() => void carregar()}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <Cd title="Leads e oportunidades" mono={`${itens.length} indicações`}>
      {itens.length === 0 ? (
        <p className="text-[13px] text-[#8a8ca3]">Nenhuma indicação recebida ainda.</p>
      ) : (
        <div className="space-y-2.5">
          {itens.map((i) => (
            <div key={i.id} className="rounded-[10px] border border-[#efece6] px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-[#0f1240]">{i.empresa}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#8a8ca3]">
                    {i.parceiro_nome || "Parceiro"} · {fmtData(i.criado_em)}
                    {i.contato_nome ? ` · ${i.contato_nome}` : ""}
                    {i.contato_email ? ` · ${i.contato_email}` : ""}
                    {i.contato_telefone ? ` · ${i.contato_telefone}` : ""}
                  </div>
                </div>
                <StTag tone={TONE[i.status] || "info"}>{i.status.replace("_", " ")}</StTag>
                {i.status === "recebida" && (
                  <BtnP disabled={agindo === i.id} onClick={() => void mover(i.id, "em_contato")}>Iniciar contato</BtnP>
                )}
                {(i.status === "recebida" || i.status === "em_contato") && (
                  <>
                    <BtnO disabled={agindo === i.id} onClick={() => void mover(i.id, "convertida")}>Converteu</BtnO>
                    <BtnO disabled={agindo === i.id} onClick={() => { if (confirm("Descartar esta indicação?")) void mover(i.id, "descartada"); }}>
                      Descartar
                    </BtnO>
                  </>
                )}
              </div>
              {i.observacao && <p className="mt-2 text-[13px] leading-relaxed text-[#6b6e88]">{i.observacao}</p>}
            </div>
          ))}
        </div>
      )}
    </Cd>
  );
}
