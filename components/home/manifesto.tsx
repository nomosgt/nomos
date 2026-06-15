"use client";

import { Container } from "@/components/ui/section";
import { SplitText } from "@/components/motion/split-text";
import { Marquee } from "@/components/motion/marquee";

const PILLARS = [
  "Leitura técnica",
  "✦",
  "Risco classificado",
  "✦",
  "Caixa devolvido",
  "✦",
  "Resultado em contrato",
  "✦",
  "Sem promessa vazia",
  "✦",
  "O céu é o limite",
];

export function Manifesto() {
  return (
    <section className="relative py-28 lg:py-40 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] overflow-hidden">
      <Container>
        <div className="max-w-5xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-paper)]/40 mb-12 flex items-center gap-3">
            <span className="h-px w-8 bg-[color:var(--color-brand-soft)]" />
            Manifesto
          </div>
          <SplitText
            as="h2"
            text="Tributário não é custo. É oportunidade mal lida."
            className="font-serif text-display-md lg:text-display-xl leading-[0.95] tracking-tight text-[color:var(--color-paper)]"
            stagger={0.04}
            splitBy="word"
          />
          <SplitText
            as="p"
            text="A diferença entre quem paga mais imposto do que deveria e quem recupera está em uma única coisa: leitura técnica. O resto é consequência."
            className="block mt-12 font-serif italic text-2xl lg:text-3xl leading-[1.35] text-[color:var(--color-paper)]/70 max-w-3xl"
            stagger={0.015}
            splitBy="word"
            delay={0.4}
          />
        </div>
      </Container>

      {/* Marquee at bottom */}
      <div className="mt-24 lg:mt-32 border-t border-[color:var(--color-paper)]/10 py-8">
        <Marquee>
          {PILLARS.map((p, i) => (
            <span
              key={i}
              className={
                p === "✦"
                  ? "font-serif text-2xl text-[color:var(--color-brand-soft)] mx-8"
                  : "font-serif text-3xl lg:text-5xl text-[color:var(--color-paper)]/85 mx-8 tracking-tight"
              }
            >
              {p}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
