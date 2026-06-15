"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Container } from "@/components/ui/section";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";

const CASES = [
  {
    setor: "Logística",
    porte: "R$ 180M / ano",
    desafio: "Operação multi-modal com alta carga de ICMS sobre energia e ST",
    teses: ["Tema 986 STJ", "PIS/COFINS sobre insumos", "Crédito presumido"],
    prazo: 9,
    valor: 8.4,
    label: "Em caixa devolvido",
    quote:
      "Recuperação executada sem qualquer autuação adicional. Manteve relacionamento intacto com a Receita.",
  },
  {
    setor: "Indústria",
    porte: "R$ 320M / ano",
    desafio: "Lucro Real com benefícios estaduais não reconhecidos no IRPJ/CSLL",
    teses: ["LC 160/2017", "EREsp 1.517.492", "Tema 69 STF"],
    prazo: 14,
    valor: 22.6,
    label: "Em créditos consolidados",
    quote:
      "Reclassificação dos créditos presumidos como subvenção. Devolução retroativa de 5 anos.",
  },
  {
    setor: "Tecnologia",
    porte: "R$ 60M / ano",
    desafio: "SaaS B2B com ISS embutido na base do PIS/COFINS",
    teses: ["Tema 118 STF", "Tema 779 STJ", "Verbas indenizatórias"],
    prazo: 6,
    valor: 2.9,
    label: "Em recuperação administrativa",
    quote:
      "Aproveitamento via PER/DCOMP em paralelo ao ajuizamento preventivo da tese filhote do ISS.",
  },
];

export function CasesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section
      ref={ref}
      className="relative py-28 lg:py-40 bg-[color:var(--color-background)] border-t border-[color:var(--color-hairline)] overflow-hidden"
    >
      <Container>
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-end mb-20 lg:mb-28">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-[color:var(--color-brand)]" />
              Cases recentes
            </div>
            <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
              Resultados reais.<br />
              <span className="italic text-[color:var(--color-brand)]">
                Nomes preservados.
              </span>
            </h2>
          </div>
          <p className="text-[16px] lg:text-[17px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md lg:justify-self-end">
            Três operações conduzidas pelo time NGT — anonimizadas por sigilo,
            mas todos os números, teses e prazos correspondem a execuções
            reais nos últimos 12 meses.
          </p>
        </div>

        {/* Cases grid */}
        <div className="space-y-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
          {CASES.map((c, i) => (
            <motion.article
              key={c.setor}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.8,
                delay: i * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group grid grid-cols-1 lg:grid-cols-[1.2fr_2fr_1.2fr] gap-8 lg:gap-16 bg-[color:var(--color-background)] p-8 lg:p-12 hover:bg-[color:var(--color-surface)] transition-colors duration-500"
            >
              {/* Esquerda: setor + porte */}
              <div className="lg:border-r lg:border-[color:var(--color-hairline)] lg:pr-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-3">
                  Case 0{i + 1}
                </div>
                <h3 className="font-serif text-3xl lg:text-4xl tracking-tight text-[color:var(--color-ink)] mb-3 transition-transform duration-500 group-hover:translate-x-1">
                  {c.setor}
                </h3>
                <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
                  Faturamento · {c.porte}
                </div>
              </div>

              {/* Centro: desafio + teses + quote */}
              <div className="space-y-5">
                <p className="text-[15px] lg:text-[16px] leading-relaxed text-[color:var(--color-ink)]">
                  {c.desafio}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {c.teses.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center px-2.5 py-1 border border-[color:var(--color-hairline)] font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="font-serif italic text-[15px] lg:text-[16px] leading-[1.5] text-[color:var(--color-ink-muted)] border-l-2 border-[color:var(--color-brand)] pl-4">
                  &ldquo;{c.quote}&rdquo;
                </p>
              </div>

              {/* Direita: resultado numérico */}
              <div className="lg:border-l lg:border-[color:var(--color-hairline)] lg:pl-8 flex flex-col justify-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-3">
                  Resultado
                </div>
                <div className="font-mono text-4xl lg:text-5xl tracking-tight text-[color:var(--color-ink)] leading-none mb-2">
                  <span className="text-[color:var(--color-ink-muted)] text-[0.55em] mr-1">
                    R$
                  </span>
                  <CountUp to={c.valor} duration={2} separator="," />
                  <span className="text-[color:var(--color-brand)]">M</span>
                </div>
                <div className="text-[13px] text-[color:var(--color-ink-muted)] mb-5">
                  {c.label}
                </div>
                <div className="pt-4 border-t border-[color:var(--color-hairline)] flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
                    Execução
                  </span>
                  <span className="font-mono text-[13px] text-[color:var(--color-ink)]">
                    <CountUp to={c.prazo} /> meses
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Disclaimer + CTA */}
        <Reveal delay={0.5}>
          <div className="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <p className="text-[12px] leading-relaxed text-[color:var(--color-ink-faint)] max-w-xl">
              Cases anonimizados em conformidade com o dever de sigilo. Detalhes
              técnicos compartilhados sob NDA, em reunião privada com o CFO ou
              jurídico da empresa interessada.
            </p>
            <a
              href="/contato"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)] transition-colors whitespace-nowrap"
            >
              <span className="link-underline">Solicitar dossiê completo</span>
              <span>→</span>
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
// end of CasesSection
