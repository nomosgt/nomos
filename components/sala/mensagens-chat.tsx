"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";

interface Msg {
  id: string;
  created_at: string;
  conteudo: string;
  autor_tipo: string;
  lido: boolean;
}

export function MensagensChat({ initial }: { initial: Msg[] }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs.length]);

  async function send() {
    if (!content.trim()) return;
    setError(null);
    const text = content.trim();
    setContent("");
    startTransition(async () => {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setError("Sessão expirada. Recarregue a página.");
        return;
      }
      const optimistic: Msg = {
        id: `tmp-${Date.now()}`,
        created_at: new Date().toISOString(),
        conteudo: text,
        autor_tipo: "cliente",
        lido: false,
      };
      setMsgs((m) => [...m, optimistic]);

      const { data, error } = await supabase
        .from("case_messages")
        .insert({
          client_id: u.user.id,
          autor_id: u.user.id,
          autor_tipo: "cliente",
          conteudo: text,
        })
        .select("id, created_at, conteudo, autor_tipo, lido")
        .single();

      if (error) {
        setError(error.message);
        setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
        setContent(text);
      } else if (data) {
        setMsgs((m) =>
          m.map((x) => (x.id === optimistic.id ? (data as Msg) : x)),
        );
        router.refresh();
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
                  </div>
                  <div className={`mt-1 text-[10px] font-mono text-[color:var(--color-ink-faint)] ${isMine ? "text-right" : ""}`}>
                    {isMine ? "Você" : "Time NGT"} ·{" "}
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
        className="border-t border-[color:var(--color-hairline)] p-4 flex items-end gap-3"
      >
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
          disabled={pending || !content.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[color:var(--color-brand)] text-[color:var(--color-paper)] text-[12px] font-mono uppercase tracking-[0.2em] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:pointer-events-none"
        >
          <Send className="w-3 h-3" />
          Enviar
        </button>
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
