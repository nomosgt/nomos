"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

export function SimuladorTeaser() {
  return (
    <section className="relative py-28 lg:py-40 overflow-hidden">
      <Container>
        <div className="relative border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] p-10 md:p-16 lg:p-24 grain overflow-hidden">
          <div className="absolute top-0 right-0 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] border-b border-l border-[color:var(--color-hairline)] py-2 px-4">
            ✦ Ferramenta proprietária
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-20 items-center">
            <div>
              <Eyebrow>Simulador NOMOS</Eyebrow>
              <Reveal>
                <h2 className="mt-8 font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
                  Estime o <span className="italic text-[color:var(--color-brand)]">potencial</span><br />
                  de recuperação<br />
                  da sua empresa.
                </h2>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="mt-8 max-w-lg text-[16px] lg:text-[17px] leading-relaxed text-[color:var(--color-ink-muted)]">
                  A partir de faturamento, setor de atuação e regime tributário,
                  o simulador apresenta uma estimativa preliminar de crédito
                  recuperável, sujeita a confirmação por análise documental.
                </p>
              </Reveal>
              <Reveal delay={0.25} className="mt-10">
                <Link
                  href="/simulador"
                  className="group inline-flex items-center gap-2 px-6 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(14,21,37,0.4)]"
                >
                  Acessar o simulador
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Reveal>
            </div>

            <Reveal delay={0.3}>
              <div className="relative bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-8 lg:p-10">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/40 mb-6">
                  Estimativa preliminar
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-paper)]/50 mb-1">
                  Potencial de recuperação
                </div>
                <div className="font-mono text-5xl lg:text-6xl tracking-tight mb-8">
                  <span className="text-[color:var(--color-paper)]/60 text-3xl mr-1">R$</span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                  >
                    1.842.300
                  </motion.span>
                </div>
                <div className="space-y-3 border-t border-[color:var(--color-paper)]/15 pt-6">
                  {[
                    ["ICMS-ST", "R$ 612.400"],
                    ["PIS / COFINS", "R$ 894.100"],
                    ["IRPJ / CSLL", "R$ 335.800"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between font-mono text-[12px] text-[color:var(--color-paper)]/70"
                    >
                      <span className="uppercase tracking-[0.15em]">{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 text-[11px] text-[color:var(--color-paper)]/40 leading-relaxed">
                  * Exemplo ilustrativo, sem valor vinculante. A estimativa
                  apresentada depende de confirmação por análise documental
                  da operação.
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
