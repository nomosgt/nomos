"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, KeyRound } from "lucide-react";
import { Cd, BtnP, fmtData } from "@/components/shell/proto-ui";

const inputCls = "w-full rounded-[9px] border border-[#dedbd3] bg-white px-3.5 py-2.5 text-center font-mono text-[18px] tracking-[0.3em] text-[#14173d] outline-none focus:border-[#0f1240]";

/** Proteção contra fraudes — réplica funcional da tela do protótipo. */
export function SegurancaSala() {
  const [token, setToken] = useState<string | null>(null);
  const [geradoEm, setGeradoEm] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<null | { valido: boolean; motivo?: string }>(null);
  const [verificando, setVerificando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/sala/seguranca", { cache: "no-store" });
      const j = await r.json();
      setToken(j.token ?? null);
      setGeradoEm(j.gerado_em ?? null);
      setAviso(j.aviso || null);
    } catch { setAviso("Erro de conexão."); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function verificar() {
    if (codigo.trim().length < 4) return;
    setVerificando(true);
    setResultado(null);
    try {
      const r = await fetch("/api/sala/seguranca", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim() }),
      });
      const j = await r.json();
      setResultado({ valido: !!j.valido, motivo: j.motivo });
    } catch {
      setResultado({ valido: false, motivo: "Erro de conexão." });
    } finally { setVerificando(false); }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Cd title="Token financeiro">
        {aviso && <p className="mb-3 text-[12.5px] text-amber-700">{aviso}</p>}
        {token ? (
          <>
            <p className="mb-4 text-[13.5px] leading-relaxed text-[#6b6e88]">
              Toda solicitação de pagamento legítima da Arché vem acompanhada
              deste token. Se uma cobrança chegar <strong>sem ele</strong>, não pague
              e fale com a equipe pelos canais oficiais.
            </p>
            <div className="rounded-[10px] border border-[#e9e6df] bg-[#f4f2ee] px-6 py-5 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7a7c95]">Seu token ativo</div>
              <div className="mt-2 font-serif text-[40px] tracking-[0.25em] text-[#0f1240]">{token}</div>
              {geradoEm && <div className="mt-1 font-mono text-[10.5px] text-[#8a8ca3]">gerado em {fmtData(geradoEm, true)}</div>}
            </div>
          </>
        ) : (
          <p className="text-[13.5px] leading-relaxed text-[#6b6e88]">
            Seu token antifraude ainda não foi emitido pela Arché. Ele aparecerá
            aqui assim que a equipe gerar — e passará a acompanhar toda
            solicitação de pagamento legítima.
          </p>
        )}
      </Cd>

      <Cd title="Verificar solicitação de pagamento">
        <p className="mb-4 text-[13.5px] leading-relaxed text-[#6b6e88]">
          Recebeu uma cobrança em nome da Arché? Digite o código que veio com
          ela para confirmar a autenticidade.
        </p>
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="______"
            inputMode="numeric"
            maxLength={10}
            value={codigo}
            onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, "")); setResultado(null); }}
          />
          <BtnP disabled={verificando || codigo.length < 4} onClick={() => void verificar()}>
            <KeyRound size={15} /> Verificar
          </BtnP>
        </div>
        {resultado && (
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-[10px] border px-4 py-3.5 text-[13.5px] ${
              resultado.valido ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {resultado.valido ? <ShieldCheck size={18} className="mt-0.5 flex-none" /> : <ShieldAlert size={18} className="mt-0.5 flex-none" />}
            {resultado.valido
              ? "Código válido. A solicitação confere com o seu token ativo."
              : resultado.motivo || "Código inválido. NÃO efetue o pagamento e avise a Arché pelos canais oficiais."}
          </div>
        )}
      </Cd>

      <Cd title="Canais oficiais" className="lg:col-span-2">
        <p className="text-[13.5px] leading-relaxed text-[#6b6e88]">
          A Arché só trata de pagamentos por estes canais: e-mail{" "}
          <a className="underline" href="mailto:contato@archebrasil.com.br">contato@archebrasil.com.br</a>{" "}
          e WhatsApp oficial{" "}
          <a className="underline" href="https://wa.me/5511933333841" target="_blank" rel="noopener noreferrer">+55 11 93333-3841</a>.
          Desconfie de qualquer outro número, boleto com beneficiário diferente ou pedido de urgência.
        </p>
      </Cd>
    </div>
  );
}
