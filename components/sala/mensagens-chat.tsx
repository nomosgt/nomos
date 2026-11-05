"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Paperclip, X, FileText } from "lucide-react";

interface Msg {
  id: string;
  created_at: string;
  conteudo: string;
  autor_tipo: string;
  lido: boolean;
  anexo_path?: string | null;
  anexo_nome?: string | null;
}

export function MensagensChat({ initial }: { initial: Msg[] }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs.length]);

  async function send() {
    const text = content.trim();
    if (!text && !file) return;
    setError(null);
    const anexo = file;
    setContent("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    startTransition(async () => {
      const fd = new FormData();
      if (text) fd.append("conteudo", text);
      if (anexo) fd.append("file", anexo);
      try {
        const r = await fetch("/api/sala/mensagens", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) { setError(j.error || "Falha ao enviar."); setContent(text); setFile(anexo); return; }
        if (j.mensagem) setMsgs((m) => [...m, j.mensagem as Msg]);
        router.refresh();
      } catch {
        setError("Erro de conexão."); setContent(text); setFile(anexo);
      }
    });
  }

  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] flex flex-col h-[600px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {msgs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-[color:var(--color-ink-faint)]">
            Sem mensagens ainda. Mande a primeira pra começar a conversa.
          </div>
        ) : (
          msgs.map((m) => {
            const isMine = m.autor_tipo === "cliente";
            return (
              <div
                key={m.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${isMine ? "" : ""}`}>
                  <div
                    className={`p-3 text-[14px] leading-relaxed ${
                      isMine
                        ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                        : "bg-[color:var(--color-surface)] text-[color:var(--color-ink)]"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.conteudo}</div>
                    {m.anexo_path && m.anexo_nome && (
                      <a
                        href={`/api/sala/mensagens?baixar=${m.id}&modo=ver`}
                        target="_blank" rel="noopener noreferrer"
                        className={`mt-2 inline-flex items-center gap-1.5 text-[12px] underline ${isMine ? "text-[color:var(--color-paper)]/90" : "text-[color:var(--color-brand)]"}`}
                      >
                        <FileText className="w-3.5 h-3.5" /> {m.anexo_nome}
                      </a>
                    )}
                  </div>
                  <div className={`mt-1 text-[10px] font-mono text-[color:var(--color-ink-faint)] ${isMine ? "text-right" : ""}`}>
                    {isMine ? "Você" : "Time Arché"} ·{" "}
                    {new Date(m.created_at).toLocaleString("pt-BR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-[color:var(--color-hairline)] p-4"
      >
        {file && (
          <div className="mb-2 flex items-center gap-2 text-[12px] text-[color:var(--color-ink-muted)]">
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate max-w-[60%]">{file.name}</span>
            <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-[color:var(--color-ink-faint)] hover:text-rose-700"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        <div className="flex items-end gap-3">
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          <button type="button" onClick={() => fileRef.current?.click()} title="Anexar arquivo" className="p-2.5 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]"><Paperclip className="w-4 h-4" /></button>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Escreva sua mensagem… (Enter envia, Shift+Enter quebra linha)"
            rows={2}
            className="flex-1 bg-transparent text-[14px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none resize-none"
          />
          <button
            type="submit"
            disabled={pending || (!content.trim() && !file)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[color:var(--color-brand)] text-[color:var(--color-paper)] text-[12px] font-mono uppercase tracking-[0.2em] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:pointer-events-none"
          >
            <Send className="w-3 h-3" />
            Enviar
          </button>
        </div>
      </form>
      {error && (
        <div className="px-4 py-2 text-[12px] text-red-600 bg-red-50 border-t border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
// end of MensagensChat
