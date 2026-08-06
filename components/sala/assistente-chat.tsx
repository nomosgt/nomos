"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGESTOES = [
  "Em que fase está o meu caso?",
  "O que é o Tema 69?",
  "Quais documentos ainda preciso enviar?",
];

export function AssistenteChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  async function enviar(texto?: string) {
    const mensagem = (texto ?? input).trim();
    if (!mensagem || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: mensagem }]);
    setLoading(true);
    try {
      const res = await fetch("/api/sala/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem,
          historico: msgs.slice(-10),
        }),
      });
      const json = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: res.ok
            ? json.resposta
            : json.error || "Não consegui responder agora. Tente o Suporte.",
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Erro de conexão. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    enviar();
  }

  return (
    <>
      {/* Botao flutuante */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-[90] inline-flex items-center gap-2 px-5 py-3.5 bg-[color:var(--color-brand)] text-white text-[13px] font-medium shadow-[0_12px_40px_-8px_rgba(22,58,138,0.5)] transition-all hover:-translate-y-0.5 ${open ? "opacity-0 pointer-events-none" : ""}`}
        aria-label="Abrir Assistente NGT"
      >
        <Sparkles className="w-4 h-4" />
        Assistente NGT
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 right-6 z-[95] w-[calc(100vw-3rem)] max-w-md bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] shadow-2xl flex flex-col"
            style={{ height: "min(560px, calc(100vh - 6rem))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[color:var(--color-brand-soft)]" />
                <div>
                  <div className="text-[13px] font-medium">Assistente NGT</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/50">
                    IA · responde sobre seu caso
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-[color:var(--color-paper)]/60 hover:text-[color:var(--color-paper)]"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {msgs.length === 0 && (
                <div className="space-y-3">
                  <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                    Olá! Sou o Assistente NGT. Posso responder sobre o andamento
                    do seu caso, conceitos tributários e uso da plataforma.
                  </p>
                  <div className="space-y-2">
                    {SUGESTOES.map((s) => (
                      <button
                        key={s}
                        onClick={() => enviar(s)}
                        className="block w-full text-left px-3 py-2.5 border border-[color:var(--color-hairline)] text-[12px] text-[color:var(--color-ink)] hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "ml-auto bg-[color:var(--color-brand)] text-white"
                      : "bg-[color:var(--color-surface)] text-[color:var(--color-ink)] border border-[color:var(--color-hairline)]"
                  }`}
                >
                  {m.content}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-[12px] text-[color:var(--color-ink-faint)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Pensando…
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={onSubmit}
              className="flex items-center gap-2 border-t border-[color:var(--color-hairline)] px-3 py-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva sua pergunta…"
                disabled={loading}
                className="flex-1 bg-transparent px-2 py-2 text-[13px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] disabled:opacity-40"
                aria-label="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="px-4 pb-3 text-[9px] text-[color:var(--color-ink-faint)] leading-snug">
              Assistente informativo — não substitui orientação jurídica da
              equipe NGT.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
