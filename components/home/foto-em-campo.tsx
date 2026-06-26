"use client";

import Image from "next/image";
import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

export function FotoEmCampo() {
  return (
    <section className="relative py-28 lg:py-40 bg-[color:var(--color-surface)] border-t border-[color:var(--color-hairline)] overflow-hidden">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-center">
          <Reveal>
            <div className="relative aspect-[4/5] lg:aspect-[5/6] bg-[color:var(--color-ink)] overflow-hidden">
              <Image
                src="/everton/everton-workshop.jpg"
                alt="Éverton Vicente no Workshop Reforma Tributária 2026"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div
                aria-hidden
                className="absolute inset-0 z-[2] pointer-events-none opacity-[0.15] mix-blend-overlay"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='8'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-0 z-[2] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent 60%, rgba(14,21,37,0.55) 100%)",
                }}
              />
              <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-[color:var(--color-paper)]/70 z-[3]" />
              <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-[color:var(--color-paper)]/70 z-[3]" />
              <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-[color:var(--color-paper)]/70 z-[3]" />
              <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-[color:var(--color-paper)]/70 z-[3]" />
              <div className="absolute top-6 left-6 z-[4] inline-flex items-center gap-2 px-3 py-1.5 bg-[color:var(--color-paper)]/10 backdrop-blur-sm border border-[color:var(--color-paper)]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-brand-soft)] animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]">
                  Em palco
                </span>
              </div>
              <div className="absolute bottom-6 left-6 right-6 z-[4] font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/85 flex items-end justify-between">
                <div className="leading-relaxed">
                  <div>Workshop · Reforma Tributária 2026</div>
                  <div className="opacity-65">O futuro da gestão fiscal</div>
                </div>
                <div className="text-right leading-relaxed">
                  <div>NGT</div>
                  <div className="opacity-65">2026</div>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="space-y-12">
            <Reveal>
              <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-8 flex items-center gap-3">
                <span className="h-px w-8 bg-[color:var(--color-brand)]" />
                Presença
              </div>
              <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
                Diagnóstico com<br />
                <span className="italic text-[color:var(--color-brand)]">visita técnica.</span>
              </h2>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="text-[16px] lg:text-[17px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md">
                A análise documental é complementada por visita à operação —
                galpão, linha de produção, cadeia de suprimento — sempre que o
                caso exigir verificação in loco para sustentar a tese.
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="grid grid-cols-3 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                {[
                  { num: "60", label: "Meses analisados em cada cliente" },
                  { num: "26", label: "Estados onde executamos teses" },
                  { num: "12", label: "Setores com cases recentes" },
                ].map((s) => (
                  <div
                    key={s.num}
                    className="bg-[color:var(--color-background)] p-5 lg:p-6"
                  >
                    <div className="font-mono text-3xl lg:text-4xl tracking-tight text-[color:var(--color-ink)] leading-none">
                      {s.num}
                    </div>
                    <div className="mt-3 text-[12px] leading-snug text-[color:var(--color-ink-muted)]">
                      {s.label}
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
