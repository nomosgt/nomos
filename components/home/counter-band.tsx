"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CountUp } from "@/components/motion/count-up";
import { Container, Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

export function CounterBand() {
  const numRef = useRef<HTMLDivElement>(null);
  const inView = useInView(numRef, { once: true, margin: "-20%" });

  return (
    <section className="relative bg-[color:var(--color-ink)] text-[color:var(--color-paper)] overflow-hidden">
      {/* Sliver azul brand passando como transição cinematic */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 right-0 h-px bg-[color:var(--color-brand)] origin-left z-10"
      />

      {/* Linhas radiando do número (decorativas, opacity baixa) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-end pr-[5%] overflow-hidden">
        <svg
          className="w-[900px] h-[900px] opacity-[0.08]"
          viewBox="0 0 900 900"
          fill="none"
          aria-hidden
        >
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
            <motion.line
              key={deg}
              x1="450"
              y1="450"
              x2={450 + Math.cos((deg * Math.PI) / 180) * 450}
              y2={450 + Math.sin((deg * Math.PI) / 180) * 450}
              stroke="var(--color-paper)"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : {}}
              transition={{
                duration: 2,
                delay: 0.4 + i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
        </svg>
      </div>

      <Container className="relative py-28 lg:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-12 lg:gap-20 items-end">
          <div>
            <Eyebrow className="text-[color:var(--color-paper)]/60 [&_span]:bg-[color:var(--color-paper)]/15">
              <span className="text-[color:var(--color-paper)]/70">
                Resultado acumulado · time NGT
              </span>
            </Eyebrow>
            <Reveal>
              <p className="mt-8 font-serif text-2xl lg:text-3xl leading-tight text-[color:var(--color-paper)]/85 max-w-md">
                Caixa que estava parado na conta da Receita —{" "}
                <span className="italic text-[color:var(--color-brand-soft)]">
                  e voltou para a operação.
                </span>
              </p>
            </Reveal>
          </div>

          <div className="text-right">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/40 mb-6">
              + Em créditos recuperados
            </div>
            {/* Número com efeito de PESO: scale-in com spring + slight rotation */}
            <motion.div
              ref={numRef}
              initial={{ opacity: 0, scale: 0.55, rotateX: -25 }}
              animate={inView ? { opacity: 1, scale: 1, rotateX: 0 } : {}}
              transition={{
                duration: 1.6,
                type: "spring",
                stiffness: 80,
                damping: 14,
              }}
              style={{ transformOrigin: "right bottom", perspective: 1200 }}
              className="font-mono font-light leading-[0.85] tracking-[-0.06em] text-[clamp(4.5rem,16vw,15rem)] text-[color:var(--color-paper)] relative"
            >
              R$
              <CountUp to={100} duration={2.8} />
              <span className="text-[color:var(--color-brand-soft)]">M</span>
              <span className="text-[color:var(--color-brand-soft)]">+</span>
            </motion.div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <span className="h-px w-12 bg-[color:var(--color-paper)]/20" />
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/50">
                Devolvidos a quem produz
              </span>
            </div>
          </div>
        </div>

        {/* Sub-stats — 3 indicadores complementares (sem repetir o número gigante acima) */}
        <div className="mt-24 lg:mt-32 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--color-paper)]/10">
          {[
            { value: 95, suffix: "%", label: "Das empresas pagam mais tributo do que deveriam" },
            { value: 5, suffix: " anos", label: "De retroatividade na recuperação de créditos" },
            { value: 7, suffix: "", label: "Etapas de segurança e validação, da análise inicial ao êxito da operação" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[color:var(--color-ink)] p-8 lg:p-10"
            >
              <div className="font-mono text-4xl lg:text-6xl tracking-tight text-[color:var(--color-paper)] leading-none">
                <CountUp to={stat.value} />
                <span className="text-[color:var(--color-brand-soft)]">{stat.suffix}</span>
              </div>
              <div className="mt-4 text-[13px] leading-relaxed text-[color:var(--color-paper)]/55 max-w-[280px]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
// end of CounterBand
