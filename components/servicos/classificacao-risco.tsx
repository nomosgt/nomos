"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

const TIPOS = [
  {
    cor: "verde",
    label: "Créditos Verdes",
    risco: "Risco Baixo",
    status: "Aprovado",
    bola: "#3B9F4F",
    bg: "rgba(59,159,79,0.06)",
    border: "rgba(59,159,79,0.35)",
    body:
      "Expressamente previstos em lei, sem risco de questionamento ou autuação fiscal. Aproveitamento direto.",
  },
  {
    cor: "amarelo",
    label: "Créditos Amarelos",
    risco: "Risco Médio",
    status: "Atenção",
    bola: "#D4A024",
    bg: "rgba(212,160,36,0.06)",
    border: "rgba(212,160,36,0.35)",
    body:
      "Passíveis de discussão interpretativa. Exigem avaliação criteriosa antes do aproveitamento — mas têm jurisprudência favorável.",
  },
  {
    cor: "vermelho",
    label: "Créditos Vermelhos",
    risco: "Alto Risco",
    status: "Crítico",
    bola: "#C13838",
    bg: "rgba(193,56,56,0.06)",
    border: "rgba(193,56,56,0.35)",
    body:
      "Sem decisões favoráveis da Receita Federal ou já negados. Aproveitamento não recomendado sem análise especializada.",
  },
];

export function ClassificacaoRisco() {
  return (
    <section className="py-28 lg:py-40 bg-[color:var(--color-surface)] border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-end mb-16 lg:mb-20">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-[color:var(--color-brand)]" />
              Classificação de risco
            </div>
            <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
              Tipos de <br />
              <span className="italic text-[color:var(--color-brand)]">Créditos.</span>
            </h2>
          </div>
          <p className="text-[16px] lg:text-[17px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md lg:justify-self-end">
            Antes de qualquer estratégia, classificamos cada crédito pelo risco
            real. Você sabe exatamente onde está pisando — e onde vale ir mais
            fundo.
          </p>
        </div>

        <div className="space-y-4">
          {TIPOS.map((t, i) => (
            <Reveal key={t.cor} delay={i * 0.1}>
              <motion.div
                whileHover={{ x: 6 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-6 lg:gap-10 p-6 lg:p-8 border-l-4 bg-[color:var(--color-background)]"
                style={{
                  borderLeftColor: t.bola,
                  backgroundColor: t.bg,
                  borderTop: `1px solid ${t.border}`,
                  borderRight: `1px solid ${t.border}`,
                  borderBottom: `1px solid ${t.border}`,
                }}
              >
                {/* Bola de cor */}
                <div className="relative">
                  <span
                    className="block w-8 h-8 lg:w-10 lg:h-10 rounded-full"
                    style={{
                      backgroundColor: t.bola,
                      boxShadow: `0 0 0 6px ${t.bg}`,
                    }}
                  />
                </div>

                {/* Conteúdo */}
                <div>
                  <div
                    className="font-mono text-[10px] uppercase tracking-[0.3em] mb-2"
                    style={{ color: t.bola }}
                  >
                    ● {t.risco}
                  </div>
                  <h3
                    className="font-serif text-2xl lg:text-3xl tracking-tight mb-2"
                    style={{ color: t.bola }}
                  >
                    {t.label}
                  </h3>
                  <p className="text-[14px] lg:text-[15px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-2xl">
                    {t.body}
                  </p>
                </div>

                {/* Status badge */}
                <div
                  className="hidden sm:inline-flex px-4 py-2 border font-mono text-[11px] uppercase tracking-[0.2em]"
                  style={{
                    color: t.bola,
                    borderColor: t.border,
                  }}
                >
                  {t.status}
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.4}>
          <p className="mt-12 max-w-2xl text-[13px] leading-relaxed text-[color:var(--color-ink-faint)]">
            Cada operação que entra na NGT passa por essa classificação antes de
            qualquer movimento. É como devolvemos previsibilidade pra uma
            decisão que normalmente é tratada no escuro.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
