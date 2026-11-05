"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ShieldQuestion, Clock, AlertTriangle, FileText, Download, X } from "lucide-react";
import { formatBRL } from "@/lib/utils";

interface Anexo { id: string; nome: string; storage_path: string }

interface Aprovacao {
  id: string;
  created_at: string;
  titulo: string;
  corpo: string;
  status: "pendente" | "aprovada" | "recusada" | "ajuste_solicitado";
  origem: "admin" | "parceiro";
  origem_nome: string | null;
  resposta: string | null;
  respondido_em: string | null;
  // estruturados (v15)
  valor_credito?: number | string | null;
  tributos?: string | null;
  periodo_apuracao?: string | null;
  modalidade?: string | null;
  inicio_previsto?: string | null;
  impacto_caixa?: string | null;
  fundamentacao?: string | null;
  risco?: string | null;
  honorarios?: string | null;
  prazo_decisao?: string | null;
  protocolo?: string | null;
  decidido_por_nome?: string | null;
  ajuste_motivo?: string | null;
  revisao?: number | null;
  anexos?: Anexo[];
}

const RISCO_CLS: Record<string, string> = {
  baixo: "text-emerald-700 border-emerald-200 bg-emerald-50",
  medio: "text-amber-700 border-amber-200 bg-amber-50",
  alto: "text-rose-700 border-rose-200 bg-rose-50",
};

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-0.5">{label}</div>
      <div className="text-[13.5px] text-[color:var(--color-ink)]">{children}</div>
    </div>
  );
}

export function AprovacaoCard({ aprovacao }: { aprovacao: Aprovacao }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "aprovar" | "ajuste">(null);
  const [termos, setTermos] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pendente = aprovacao.status === "pendente";
  const valor = aprovacao.valor_credito != null && aprovacao.valor_credito !== "" ? Number(aprovacao.valor_credito) : null;
  const risco = (aprovacao.risco || "").toLowerCase();
  const prazo = aprovacao.prazo_decisao ? new Date(aprovacao.prazo_decisao) : null;
  const expirado = prazo ? prazo.getTime() < Date.now() : false;

  async function enviar(decisao: "aprovada" | "ajuste") {
    setErro(null);
    if (decisao === "aprovada" && !termos) { setErro("Confirme a leitura e concordância com os termos."); return; }
    if (decisao === "ajuste" && motivo.trim().length < 3) { setErro("Descreva o motivo do ajuste."); return; }
    setEnviando(true);
    try {
      const r = await fetch("/api/sala/aprovacoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          decisao === "aprovada"
            ? { id: aprovacao.id, decisao: "aprovada", termos_aceito: true }
            : { id: aprovacao.id, decisao: "ajuste", motivo: motivo.trim(), resposta: obs.trim() || undefined },
        ),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao registrar a decisão."); setEnviando(false); return; }
      setModal(null);
      router.refresh();
    } catch { setErro("Erro de conexão. Tente novamente."); setEnviando(false); }
  }

  return (
    <div className={`border bg-[color:var(--color-paper)] p-6 ${pendente ? "border-amber-300 border-l-4 border-l-amber-500" : "border-[color:var(--color-hairline)]"}`}>
      {/* cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <ShieldQuestion className="w-4 h-4 text-[color:var(--color-brand)]" />
          <h3 className="font-serif text-lg text-[color:var(--color-ink)]">{aprovacao.titulo}</h3>
        </div>
        <StatusBadge status={aprovacao.status} />
      </div>

      <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)] mb-4 flex flex-wrap gap-x-2">
        <span>{aprovacao.origem === "parceiro" ? `Solicitada por ${aprovacao.origem_nome || "colaborador"}` : "Solicitada pela equipe Arché"}</span>
        <span>· {new Date(aprovacao.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        {prazo && (
          <span className={expirado && pendente ? "text-rose-700" : ""}>· prazo: {prazo.toLocaleDateString("pt-BR")}{expirado && pendente ? " (vencido)" : ""}</span>
        )}
        {(aprovacao.revisao ?? 0) > 0 && <span>· revisão {aprovacao.revisao}</span>}
      </div>

      {valor != null && (
        <div className="mb-4">
          <div className="font-serif text-2xl text-[color:var(--color-ink)]">{formatBRL(valor)}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-faint)]">valor do crédito</div>
        </div>
      )}

      {aprovacao.corpo && <p className="text-[14px] leading-relaxed text-[color:var(--color-ink)] whitespace-pre-wrap mb-4">{aprovacao.corpo}</p>}

      {/* campos estruturados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-4">
        <Campo label="Tributos">{aprovacao.tributos}</Campo>
        <Campo label="Período apurado">{aprovacao.periodo_apuracao}</Campo>
        <Campo label="Modalidade">{aprovacao.modalidade}</Campo>
        <Campo label="Início previsto">{aprovacao.inicio_previsto}</Campo>
        <Campo label="Impacto no caixa">{aprovacao.impacto_caixa}</Campo>
        <Campo label="Honorários">{aprovacao.honorarios}</Campo>
        <Campo label="Fundamentação">{aprovacao.fundamentacao}</Campo>
        {risco && (
          <Campo label="Risco">
            <span className={`inline-block font-mono text-[10px] uppercase px-2 py-0.5 border ${RISCO_CLS[risco] || "text-gray-600 border-gray-200 bg-gray-50"}`}>{aprovacao.risco}</span>
          </Campo>
        )}
      </div>

      {/* anexos */}
      {aprovacao.anexos && aprovacao.anexos.length > 0 && (
        <div className="mb-4 border-t border-[color:var(--color-hairline)] pt-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-2">Anexos</div>
          <div className="space-y-1.5">
            {aprovacao.anexos.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-[13px]">
                <FileText className="w-3.5 h-3.5 text-[color:var(--color-ink-muted)]" />
                <span className="flex-1 min-w-0 truncate">{a.nome}</span>
                <a href={`/api/sala/documentos/baixar?path=${encodeURIComponent(a.storage_path)}&modo=ver`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-brand)] hover:underline">Abrir</a>
                <a href={`/api/sala/documentos/baixar?path=${encodeURIComponent(a.storage_path)}&modo=baixar`} className="p-1 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]"><Download className="w-3.5 h-3.5" /></a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ações / resultado */}
      {pendente ? (
        <div className="border-t border-[color:var(--color-hairline)] pt-4 flex flex-wrap gap-3">
          <button onClick={() => { setErro(null); setTermos(false); setModal("aprovar"); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 transition-all hover:-translate-y-0.5">
            <CheckCircle2 className="w-4 h-4" /> Aprovar
          </button>
          <button onClick={() => { setErro(null); setMotivo(""); setObs(""); setModal("ajuste"); }} className="inline-flex items-center gap-2 px-5 py-2.5 border border-[color:var(--color-brand)] text-[color:var(--color-brand)] text-[13px] font-medium hover:bg-blue-50/50 transition-all">
            <AlertTriangle className="w-4 h-4" /> Solicitar ajuste
          </button>
        </div>
      ) : (
        <div className="border-t border-[color:var(--color-hairline)] pt-3 text-[13px] text-[color:var(--color-ink-muted)] space-y-1">
          {aprovacao.status === "aprovada" && aprovacao.protocolo && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-700">Protocolo</span>
              <span className="font-mono text-[13px] text-[color:var(--color-ink)]">{aprovacao.protocolo}</span>
            </div>
          )}
          {aprovacao.status === "ajuste_solicitado" && aprovacao.ajuste_motivo && (
            <p className="text-amber-800">Ajuste solicitado: &ldquo;{aprovacao.ajuste_motivo}&rdquo;</p>
          )}
          {aprovacao.resposta && <p>&ldquo;{aprovacao.resposta}&rdquo;</p>}
          {aprovacao.respondido_em && (
            <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
              {aprovacao.decidido_por_nome ? `por ${aprovacao.decidido_por_nome} · ` : ""}
              {new Date(aprovacao.respondido_em).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      )}

      {/* MODAL APROVAR */}
      {modal === "aprovar" && (
        <ModalBox onClose={() => !enviando && setModal(null)} titulo="Confirmar aprovação">
          <p className="text-[13.5px] text-[color:var(--color-ink-muted)] mb-4">
            Você está autorizando: <strong className="text-[color:var(--color-ink)]">{aprovacao.titulo}</strong>
            {valor != null && <> no valor de <strong className="text-[color:var(--color-ink)]">{formatBRL(valor)}</strong></>}.
            {aprovacao.inicio_previsto && <> Início previsto: {aprovacao.inicio_previsto}.</>}
          </p>
          <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
            <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} className="mt-0.5" />
            <span className="text-[13px] text-[color:var(--color-ink)]">Li o parecer e concordo com os termos.</span>
          </label>
          {erro && <p className="text-[12px] text-rose-700 mb-3">{erro}</p>}
          <div className="flex gap-3">
            <button onClick={() => void enviar("aprovada")} disabled={enviando || !termos} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 disabled:opacity-50">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar aprovação
            </button>
            <button onClick={() => setModal(null)} disabled={enviando} className="px-4 py-2.5 border border-[color:var(--color-hairline)] text-[13px]">Cancelar</button>
          </div>
        </ModalBox>
      )}

      {/* MODAL AJUSTE */}
      {modal === "ajuste" && (
        <ModalBox onClose={() => !enviando && setModal(null)} titulo="Solicitar ajuste">
          <p className="text-[13.5px] text-[color:var(--color-ink-muted)] mb-3">Descreva o que precisa ser revisto antes de você aprovar. A equipe Arché recebe seu pedido e reapresenta a autorização ajustada.</p>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo do ajuste (obrigatório)" className="w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2.5 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)] mb-3" />
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} placeholder="Observações (opcional)" className="w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2.5 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)] mb-3 resize-y" />
          {erro && <p className="text-[12px] text-rose-700 mb-3">{erro}</p>}
          <div className="flex gap-3">
            <button onClick={() => void enviar("ajuste")} disabled={enviando} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-brand)] text-white text-[13px] font-medium disabled:opacity-50">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} Enviar pedido de ajuste
            </button>
            <button onClick={() => setModal(null)} disabled={enviando} className="px-4 py-2.5 border border-[color:var(--color-hairline)] text-[13px]">Cancelar</button>
          </div>
        </ModalBox>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Aprovacao["status"] }) {
  if (status === "aprovada") return <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-emerald-700 bg-emerald-50 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Aprovada</span>;
  if (status === "recusada") return <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-red-700 bg-red-50 border border-red-200"><XCircle className="w-3 h-3" /> Recusada</span>;
  if (status === "ajuste_solicitado") return <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-amber-800 bg-amber-50 border border-amber-200"><AlertTriangle className="w-3 h-3" /> Ajuste solicitado</span>;
  return <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-amber-700 bg-amber-50 border border-amber-200"><Clock className="w-3 h-3" /> Aguardando você</span>;
}

function ModalBox({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] max-w-lg w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-serif text-xl">{titulo}</h4>
          <button onClick={onClose} className="p-1 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink)]"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
