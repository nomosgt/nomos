"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";

/** Avisos internos do colaborador — novas tarefas, prazos, revisões. */

interface Notif { id: string; evento: string; titulo: string; lida: boolean; created_at: string }

export function NotificacoesParceiro() {
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const [naoLidas, setNaoLidas] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/parceiros/notificacoes", { cache: "no-store" });
      if (!r.ok) { setNotifs([]); return; }
      const j = await r.json();
      setNotifs(j.notificacoes ?? []); setNaoLidas(j.naoLidas ?? 0);
    } catch { setNotifs([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { const t = setInterval(() => void carregar(), 60000); return () => clearInterval(t); }, [carregar]);

  async function marcarTodas() {
    const ids = (notifs ?? []).filter((n) => !n.lida).map((n) => n.id);
    if (!ids.length) return;
    await fetch("/api/parceiros/notificacoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    void carregar();
  }

  if (!notifs || naoLidas === 0) return null;  // só aparece quando há algo novo

  return (
    <div className="mb-6 border border-blue-200 bg-blue-50/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[color:var(--color-ink)]">
          <Bell className="w-4 h-4 text-[color:var(--color-brand)]" /> Avisos ({naoLidas})
        </div>
        <button onClick={() => void marcarTodas()} className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-brand)] hover:underline">
          <Check className="w-3 h-3" /> Marcar lidos
        </button>
      </div>
      <div className="space-y-1">
        {notifs.filter((n) => !n.lida).slice(0, 8).map((n) => (
          <div key={n.id} className="text-[13px]">
            • {n.titulo}
            <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)] ml-2">{new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
