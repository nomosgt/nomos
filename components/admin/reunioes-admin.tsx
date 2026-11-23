"use client";

import { useCallback, useEffect, useState } from "react";
import { Cd, StTag, BtnO, BtnP, fmtData } from "@/components/shell/proto-ui";

type Reuniao = {
  id: string; solicitante_tipo: string; solicitante: string; empresa: string | null;
  titulo: string; detalhes: string | null; data_sugerida: string | null;
  data_confirmada: string | null; status: string; criado_em: string;
};

export function ReunioesAdmin() {
  const [reunioes, setReunioes] = useState<Reuniao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [agindo, setAgindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await fetch("/api/admin/reunioes", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao carregar."); setReunioes([]); return; }
      setReunioes(j.reunioes || []);
    } catch { setErro("Erro de conexão."); setReunioes([]); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function agir(id: string, status: "confirmada" | "concluida" | "cancelada") {
    setAgindo(id);
    try {
      const r = await fetch("/api/admin/reunioes", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha."); return; }
      await carregar();
    } finally { setAgindo(null); }
  }

  if (reunioes === null) return <p className="text-[13px] text-[#8a8ca3]">Carregando…</p>;
  if (erro) {
    return (
      <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-5 text-[13.5px] text-rose-800">
        {erro} <button className="ml-2 underline" onClick={() => void carregar()}>Tentar novamente</button>
      </div>
    );
  }
  const abertas = reunioes.filter((r) => r.status === "solicitada" || r.status === "confirmada");
  const encerradas = reunioes.filter((r) => r.status === "concluida" || r.status === "cancelada");

  return (
    <div className="space-y-5">
      <Cd title="Reuniões solicitadas e confirmadas" mono={`${abertas.length} abertas`}>
        {abertas.length === 0 ? (
          <p className="text-[13px] text-[#8a8ca3]">Nenhuma reunião pendente.</p>
        ) : (
          <div className="space-y-2.5">
            {abertas.map((r) => (
              <div key={r.id} className="rounded-[10px] border border-[#efece6] px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[#0f1240]">{r.titulo}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#8a8ca3]">
                      {r.solicitante_tipo === "cliente" ? "Cliente" : r.solicitante_tipo === "parceiro" ? "Parceiro" : "Arché"} · {r.solicitante}
                      {r.empresa ? ` · ${r.empresa}` : ""} · pedida em {fmtData(r.criado_em)}
                      {r.data_sugerida ? ` · sugerida ${fmtData(r.data_sugerida, true)}` : ""}
                      {r.data_confirmada ? ` · confirmada ${fmtData(r.data_confirmada, true)}` : ""}
                    </div>
                  </div>
                  <StTag tone={r.status === "confirmada" ? "ok" : "warn"}>{r.status}</StTag>
                  {r.status === "solicitada" && (
                    <BtnP disabled={agindo === r.id} onClick={() => void agir(r.id, "confirmada")}>Confirmar</BtnP>
                  )}
                  {r.status === "confirmada" && (
                    <BtnO disabled={agindo === r.id} onClick={() => void agir(r.id, "concluida")}>Concluir</BtnO>
                  )}
                  <BtnO disabled={agindo === r.id} onClick={() => { if (confirm("Cancelar esta reunião?")) void agir(r.id, "cancelada"); }}>
                    Cancelar
                  </BtnO>
                </div>
                {r.detalhes && <p className="mt-2 text-[13px] leading-relaxed text-[#6b6e88]">{r.detalhes}</p>}
              </div>
            ))}
          </div>
        )}
      </Cd>

      {encerradas.length > 0 && (
        <Cd title="Histórico" mono={`${encerradas.length}`}>
          <div className="space-y-2">
            {encerradas.slice(0, 30).map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-[#f1eee8] pb-2 last:border-0">
                <div className="min-w-0 flex-1 truncate text-[13px] text-[#14173d]">{r.titulo} · <span className="text-[#8a8ca3]">{r.solicitante}</span></div>
                <span className="font-mono text-[11px] text-[#8a8ca3]">{fmtData(r.criado_em)}</span>
                <StTag tone={r.status === "concluida" ? "ok" : "bad"}>{r.status}</StTag>
              </div>
            ))}
          </div>
        </Cd>
      )}
    </div>
  );
}
