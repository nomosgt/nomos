"use client";

import Image from "next/image";
import { Container, Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

export function Time() {
  return (
    <section className="py-28 lg:py-40 bg-[color:var(--color-surface)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-24">
          <div>
            <Eyebrow>Time</Eyebrow>
            <h2 className="mt-8 font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
              Quem está por trás.<br />
              <span className="italic text-[color:var(--color-brand)]">Atenção cirúrgica.</span>
            </h2>
            <p className="mt-8 text-[16px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md">
              Cada cliente é acompanhado de perto pelo responsável técnico que
              conduziu o diagnóstico. Sem terceirização interna, sem repasse
              para quem não conhece a operação.
            </p>
          </div>

          <Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
              <div className="bg-[color:var(--color-background)] p-8 lg:p-10">
                <div className="aspect-square bg-[color:var(--color-ink)] mb-6 relative overflow-hidden">
                  <Image
                    src="/everton/everton-palco.jpg"
                    alt="Éverton Vicente"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 100vw, 30vw"
                  />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
                  CEO e Fundador
                </div>
                <h3 className="font-serif text-2xl text-[color:var(--color-ink)] mb-2">
                  Éverton Vicente
                </h3>
                <p className="text-[13px] text-[color:var(--color-ink-muted)] leading-relaxed">
                  Advogado tributarista. Bacharel em Direito (USF). Pós em
                  Direito Tributário (FAVI).
                </p>
              </div>

              <div className="bg-[color:var(--color-background)] p-8 lg:p-10 flex flex-col">
                <div className="aspect-square bg-[color:var(--color-surface)] mb-6 relative overflow-hidden flex items-center justify-center">
                  <div className="text-center">
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
                      Em breve
                    </div>
                    <div className="font-serif text-5xl text-[color:var(--color-ink)]/20">
                      ✦
                    </div>
                  </div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
                  Time NGT
                </div>
                <h3 className="font-serif text-2xl text-[color:var(--color-ink-faint)] mb-2">
                  Em expansão
                </h3>
                <p className="text-[13px] text-[color:var(--color-ink-muted)] leading-relaxed">
                  Equipe técnica em estruturação. Anunciaremos os novos
                  integrantes conforme as posições forem confirmadas.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
