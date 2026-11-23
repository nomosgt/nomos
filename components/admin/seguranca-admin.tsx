"use client";

import { useCallback, useEffect, useState } from "react";
import { Cd, BtnP, fmtData } from "@/components/shell/proto-ui";

type ClienteOpt = { user_id: string; nome: string; empresa: string | null };

export function SegurancaAdmin() {
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [geradoEm, setGeradoEm] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [agindo, setAgindo] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/horas", { cache: "no-store" }); // reaproveita a lista de clientes
        const j = await r.json();
        if (r.ok) setClientes(j.clientes || []);
      } catch { /* silencioso */ }
    })();
  }, []);

  const carregarToken = useCallback(async (id: string) => {
    setErro(null); setToken(null); setGeradoEm(null);
    if (!id) return;
    try {
      const r = await fetch(`/api/admin/seguranca?client_id=${id}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao carregar."); return; }
      setToken(j.token ?? null);
      setGeradoEm(j.gerado_em ?? null);
    } catch { setErro("Erro de conexão."); }
  }, []);

  async function gerar() {
    if (!clientId) return;
    if (token && !confirm("Já existe um token ativo. Gerar um novo INVALIDA o anterior. Continuar?")) return;
    setAgindo(true);
    try {
      const r = await fetch("/api/admin/seguranca", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || "Falha ao gerar."); return; }
      await carregarToken(clientId);
    } finally { setAgindo(false); }
  }

  return (
    <Cd title="Token financeiro por cliente">
      <p className="mb-4 text-[13.5px] leading-relaxed text-[#6b6e88]">
        O token acompanha toda solicitação de pagamento legítima. O cliente o vê
        na Sala (Proteção contra fraudes) e usa para validar cobranças.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="min-w-[260px] rounded-[9px] border border-[#dedbd3] bg-white px-3.5 py-2.5 text-[13.5px] text-[#14173d] outline-none focus:border-[#0f1240]"
          value={clientId}
          onChange={(e) => { setClientId(e.target.value); void carregarToken(e.target.value); }}
        >
          <option value="">Selecione o cliente…</option>
          {clientes.map((c) => (
            <option key={c.user_id} value={c.user_id}>{c.empresa || c.nome}</option>
          ))}
        </select>
        <BtnP disabled={!clientId || agindo} onClick={() => void gerar()}>
          {token ? "Rotacionar token" : "Gerar token"}
        </BtnP>
      </div>
      {erro && <p className="mt-3 text-[13px] text-rose-700">{erro}</p>}
      {clientId && !erro && (
        <div className="mt-4 rounded-[10px] border border-[#e9e6df] bg-[#f4f2ee] px-6 py-4 text-center">
          {token ? (
            <>
              <div className="font-serif text-[32px] tracking-[0.25em] text-[#0f1240]">{token}</div>
              {geradoEm && <div className="mt-1 font-mono text-[10.5px] text-[#8a8ca3]">gerado em {fmtData(geradoEm, true)}</div>}
            </>
          ) : (
            <div className="text-[13px] text-[#8a8ca3]">Este cliente ainda não tem token.</div>
          )}
        </div>
      )}
    </Cd>
  );
}
