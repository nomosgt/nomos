"use client";

import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { EvertonPortrait } from "@/components/sobre/everton-portrait";

export function Bio() {
  return (
    <section className="py-24 lg:py-32 border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-24 items-start">
          {/* Foto do Éverton — duotone + mask wipe + frame editorial */}
          <Reveal>
            <EvertonPortrait />
          </Reveal>

          {/* Bio text — copy oficial briefing 101 */}
          <div className="space-y-7">
            <Reveal>
              <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-4 flex items-center gap-3">
                <span className="h-px w-8 bg-[color:var(--color-brand)]" />
                Liderança
              </div>
              <h2 className="font-serif text-3xl lg:text-4xl leading-[1.1] tracking-tight text-[color:var(--color-ink)]">
                Everton Vicente
                <span className="block mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-ink-muted)]">
                  CEO e Fundador da Arché
                </span>
              </h2>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-[17px] leading-[1.7] text-[color:var(--color-ink-muted)]">
                O escritório é liderado por seu CEO, Everton Vicente,
                profissional com trajetória construída no ambiente empresarial
                e nas relações institucionais, com experiência junto a grandes
                escritórios e empresas de diferentes segmentos. Essa vivência
                proporcionou uma visão abrangente sobre os desafios,
                particularidades e oportunidades presentes na gestão dos
                negócios.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-12 grid grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                {[
                  ["Função", "CEO e Fundador"],
                  ["Resultado", "R$ 100M+ recuperados pelo time Arché"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-[color:var(--color-background)] p-6"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
                      {label}
                    </div>
                    <div className="font-serif text-lg text-[color:var(--color-ink)]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
