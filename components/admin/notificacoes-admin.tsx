"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";

/** Notificações internas persistidas do admin (sem simular push). */

interface Notif { id: string; evento: string; titulo: string; referencia_tipo: string | null; referencia_id: string | null; lida: boolean; created_at: string }

function destino(n: Notif): string {
  if (n.referencia_tipo === "analise" && n.referencia_id) return `/admin/analises?abrir=${n.referencia_id}`;
  if (n.referencia_tipo === "atividade") return "/admin/atividades";
  if (n.referencia_tipo === "cliente" && n.referencia_id) return `/admin/clientes/${n.referencia_id}`;
  return "/admin";
}

export function NotificacoesAdmin() {
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const [naoLidas, setNaoLidas] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/notificacoes", { cache: "no-store" });
      const j = await r.json();
      setNotifs(j.notificacoes ?? []); setNaoLidas(j.naoLidas ?? 0);
    } catch { setNotifs([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { const t = setInterval(() => void carregar(), 60000); return () => clearInterval(t); }, [carregar]);

  async function marcarTodas() {
    const ids = (notifs ?? []).filter((n) => !n.lida).map((n) => n.id);
    if (!ids.length) return;
    await fetch("/api/admin/notificacoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    void carregar();
  }

  if (!notifs || notifs.length === 0) return null;

  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[color:var(--color-brand)]" />
          <span className="font-medium text-[14px]">Notificações</span>
          {naoLidas > 0 && <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[color:var(--color-brand)] text-white">{naoLidas}</span>}
        </div>
        {naoLidas > 0 && (
          <button onClick={() => void marcarTodas()} className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink)]">
            <Check className="w-3 h-3" /> Marcar lidas
          </button>
        )}
      </div>
      <div className="divide-y divide-[color:var(--color-hairline)] max-h-56 overflow-y-auto">
        {notifs.slice(0, 12).map((n) => (
          <Link key={n.id} href={destino(n)} className={`block py-2 text-[13px] hover:underline ${n.lida ? "text-[color:var(--color-ink-faint)]" : "font-medium"}`}>
            {!n.lida && <span className="inline-block w-1.5 h-1.5 bg-[color:var(--color-brand)] rounded-full mr-2 align-middle" />}
            {n.titulo}
            <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)] ml-2">{new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
