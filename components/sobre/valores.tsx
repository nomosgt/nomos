"use client";

import { Container, Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

const VALORES = [
  {
    n: "01",
    title: "Rigor técnico",
    body: "Cada tese sustentada em análise dogmática e jurisprudencial.",
  },
  {
    n: "02",
    title: "Discrição",
    body: "Confidencialidade absoluta. Trabalho que não vaza para o mercado.",
  },
  {
    n: "03",
    title: "Resultado mensurável",
    body: "Indicadores claros. Sem promessa que não tem como cumprir.",
  },
  {
    n: "04",
    title: "Parceria de longo prazo",
    body: "Os melhores ganhos vêm da leitura continuada — não do projeto pontual.",
  },
];

export function Valores() {
  return (
    <section className="py-28 lg:py-40">
      <Container>
        <Eyebrow>Valores</Eyebrow>
        <h2 className="mt-8 font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight max-w-4xl">
          O que orienta cada decisão técnica.
        </h2>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
          {VALORES.map((v, i) => (
            <Reveal key={v.n} delay={i * 0.08}>
              <div className="bg-[color:var(--color-background)] p-8 lg:p-10 h-full group hover:bg-[color:var(--color-surface)] transition-colors duration-500">
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-8">
                  / {v.n}
                </div>
                <h3 className="font-serif text-2xl lg:text-3xl text-[color:var(--color-ink)] mb-4 leading-tight tracking-tight">
                  {v.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-[color:var(--color-ink-muted)]">
                  {v.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
