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

          {/* Bio text */}
          <div className="space-y-7">
            <Reveal>
              <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-4 flex items-center gap-3">
                <span className="h-px w-8 bg-[color:var(--color-brand)]" />
                CEO e Fundador
              </div>
              <p className="font-serif text-3xl lg:text-4xl leading-[1.2] tracking-tight text-[color:var(--color-ink)]">
                &ldquo;Tributário não precisa ser complexo. Precisa ser{" "}
                <span className="italic text-[color:var(--color-brand)]">
                  bem lido
                </span>
                .&rdquo;
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-[17px] leading-[1.65] text-[color:var(--color-ink-muted)]">
                Advogado pela Universidade São Francisco, pós-graduando em
                Direito Tributário e Processual Tributário pela Faculdade
                Alphaville. Liderou a recuperação de créditos tributários para
                empresas de portes e setores diferentes — da indústria pesada
                ao varejo digital.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-12 grid grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                {[
                  ["Formação", "Direito — USF"],
                  ["Pós-graduação", "Tributário — FAVI"],
                  ["Função", "CEO e Fundador"],
                  ["Resultado", "R$ 100M+ recuperados"],
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
