"use client";

import { useCallback, useEffect, useState } from "react";
import { ListTodo, AlertTriangle, Clock, CheckCircle2, Circle, PlayCircle } from "lucide-react";

/**
 * Central da Advogada · Minhas atividades — tarefas atribuídas pelo gestor,
 * com prazo, prioridade, cliente/processo e alerta de atraso. A advogada
 * avança o status (pendente → em andamento → concluída).
 */

interface Atividade {
  id: string; titulo: string; descricao: string | null; prioridade: string;
  status: string; prazo: string | null; concluida_em: string | null;
  cliente_nome: string | null; cliente_empresa: string | null; caso_titulo: string | null;
  alerta: "atraso" | "aviso_24h" | "aviso_48h" | null;
}

const PRIO_CLS: Record<string, string> = {
  alta: "text-rose-700 border-rose-200 bg-rose-50",
  media: "text-amber-700 border-amber-200 bg-amber-50",
  baixa: "text-gray-600 border-gray-200 bg-gray-50",
};
const ALERTA_LABEL: Record<string, string> = { atraso: "Atrasada", aviso_24h: "Vence em 24h", aviso_48h: "Vence em 48h" };

function fmtPrazo(iso: string | null): string {
  if (!iso) return "sem prazo";
  const d = new Date(iso); if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function AtividadesAdvogada() {
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);
  const [filtro, setFiltro] = useState<"abertas" | "todas" | "atrasadas">("abertas");

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/parceiros/atividades", { cache: "no-store" });
      if (!r.ok) { setAtividades([]); return; }
      const j = await r.json();
      setAtividades(j.atividades ?? []);
    } catch { setAtividades([]); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { const t = setInterval(() => void carregar(), 30000); return () => clearInterval(t); }, [carregar]);

  async function mudar(a: Atividade, status: string) {
    setAtividades((prev) => (prev ?? []).map((x) => (x.id === a.id ? { ...x, status, alerta: status === "concluida" ? null : x.alerta } : x)));
    await fetch("/api/parceiros/atividades", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, status }) });
    void carregar();
  }

  if (atividades === null) return null;
  if (atividades.length === 0) return null;

  const atrasadas = atividades.filter((a) => a.alerta === "atraso").length;
  const vis = atividades.filter((a) =>
    filtro === "todas" ? true : filtro === "atrasadas" ? a.alerta === "atraso" : a.status !== "concluida",
  );

  return (
    <div className="mb-8 border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-[color:var(--color-brand)]" />
          <span className="font-medium text-[15px]">Minhas atividades</span>
          {atrasadas > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase px-1.5 py-0.5 border border-rose-200 bg-rose-50 text-rose-700">
              <AlertTriangle className="w-3 h-3" /> {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.15em]">
          {(["abertas", "atrasadas", "todas"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-2 py-1 ${filtro === f ? "text-[color:var(--color-brand)] border-b-2 border-[color:var(--color-brand)]" : "text-[color:var(--color-ink-faint)]"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {vis.length === 0 ? (
        <p className="text-[13px] text-[color:var(--color-ink-faint)] py-4 text-center">Nada por aqui neste filtro. 🎉</p>
      ) : (
        <div className="space-y-2">
          {vis.map((a) => (
            <div key={a.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 border px-4 py-3 ${a.alerta === "atraso" ? "border-rose-200 bg-rose-50/40" : "border-[color:var(--color-hairline)]"}`}>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium text-[13.5px] ${a.status === "concluida" ? "line-through text-[color:var(--color-ink-faint)]" : "text-[color:var(--color-ink)]"}`}>{a.titulo}</span>
                  <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${PRIO_CLS[a.prioridade]}`}>{a.prioridade}</span>
                  {a.alerta && (
                    <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.5 border ${a.alerta === "atraso" ? "text-rose-700 border-rose-200 bg-rose-50" : "text-amber-700 border-amber-200 bg-amber-50"}`}>
                      {a.alerta === "atraso" ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {ALERTA_LABEL[a.alerta]}
                    </span>
                  )}
                </div>
                {a.descricao && <div className="text-[12px] text-[color:var(--color-ink-muted)] mt-0.5">{a.descricao}</div>}
                <div className="text-[11px] text-[color:var(--color-ink-faint)] font-mono mt-0.5 flex flex-wrap gap-x-2">
                  {a.cliente_nome && <span>{a.cliente_nome}</span>}
                  {a.caso_titulo && <span>· {a.caso_titulo}</span>}
                  <span>· {fmtPrazo(a.prazo)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <BotaoStatus ativo={a.status === "pendente"} onClick={() => void mudar(a, "pendente")} icon={Circle} label="Pendente" />
                <BotaoStatus ativo={a.status === "em_andamento"} onClick={() => void mudar(a, "em_andamento")} icon={PlayCircle} label="Em andamento" cor="text-[color:var(--color-brand)]" />
                <BotaoStatus ativo={a.status === "concluida"} onClick={() => void mudar(a, "concluida")} icon={CheckCircle2} label="Concluir" cor="text-emerald-700" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BotaoStatus({ ativo, onClick, icon: Icon, label, cor }: { ativo: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; cor?: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`inline-flex items-center justify-center w-8 h-8 border transition-colors ${
        ativo
          ? `border-[color:var(--color-brand)] bg-blue-50/60 ${cor || "text-[color:var(--color-ink)]"}`
          : "border-[color:var(--color-hairline)] text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink)]"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
