"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/section";
import { StaggerReveal, staggerItem } from "@/components/motion/reveal";

const PRINCIPIOS = [
  {
    n: "I.",
    title: "Diagnóstico antes de tese",
    body:
      "Toda recuperação começa por uma varredura técnica dos últimos 60 meses — EFD-Contribuições, EFD-ICMS/IPI, DCTF, ECF e SPED. Antes de propor qualquer tese, sabemos exatamente onde estão os créditos não aproveitados.",
    detail: "60 meses analisados",
  },
  {
    n: "II.",
    title: "Risco classificado, sempre",
    body:
      "Cada tese identificada recebe classificação verde / amarelo / vermelho antes de virar estratégia. O cliente vê o risco real antes de tomar decisão — não depois.",
    detail: "3 níveis · semafórico",
  },
  {
    n: "III.",
    title: "Execução documentada",
    body:
      "Cada passo gera relatório técnico arquivável: parecer fundamentado, planilha de cálculo, despacho processual. Você nunca recebe 'fui lá e fiz' — recebe a prova.",
    detail: "100% rastreável",
  },
];

export function Bastidores() {
  return (
    <section className="py-28 lg:py-40 bg-[color:var(--color-background)] border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-end mb-20 lg:mb-24">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-[color:var(--color-brand)]" />
              Bastidores
            </div>
            <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
              Como pensamos<br />
              <span className="italic text-[color:var(--color-brand)]">
                tributário aqui dentro.
              </span>
            </h2>
          </div>
          <p className="text-[16px] lg:text-[17px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md lg:justify-self-end">
            Três princípios técnicos que estruturam cada decisão na NGT — do
            primeiro diagnóstico à última petição.
          </p>
        </div>

        <StaggerReveal stagger={0.12}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
            {PRINCIPIOS.map((p) => (
              <motion.div
                key={p.n}
                variants={staggerItem}
                className="group relative bg-[color:var(--color-background)] p-8 lg:p-12 hover:bg-[color:var(--color-surface)] transition-colors duration-500 overflow-hidden"
              >
                {/* Número Romano gigante no fundo */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -top-4 font-serif italic text-[clamp(7rem,12vw,10rem)] leading-none text-transparent select-none transition-opacity duration-500 opacity-[0.06] group-hover:opacity-[0.12]"
                  style={{ WebkitTextStroke: "1px var(--color-ink)" }}
                >
                  {p.n}
                </span>

                <div className="relative">
                  <div className="font-serif italic text-3xl text-[color:var(--color-brand)] mb-8">
                    {p.n}
                  </div>
                  <h3 className="font-serif text-2xl lg:text-3xl leading-tight tracking-tight text-[color:var(--color-ink)] mb-5">
                    {p.title}
                  </h3>
                  <p className="text-[14px] lg:text-[15px] leading-relaxed text-[color:var(--color-ink-muted)] mb-8">
                    {p.body}
                  </p>
                  <div className="pt-5 border-t border-[color:var(--color-hairline)] font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)]">
                    ◇ {p.detail}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </StaggerReveal>
      </Container>
    </section>
  );
}
// end of Bastidores
