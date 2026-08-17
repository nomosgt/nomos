"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/section";
import { SplitText } from "@/components/motion/split-text";
import { HeroArt } from "@/components/motion/hero-art";

export function Hero() {
  return (
    <section className="relative min-h-screen pt-24 lg:pt-32 pb-16 flex flex-col grain overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, rgba(22,58,138,0.07) 0%, transparent 60%)",
        }}
      />

      <HeroArt />

      {/* Barras diagonais oficiais — marca d'água editorial à direita */}
      <div
        aria-hidden
        className="absolute -right-24 top-1/2 -translate-y-1/2 h-[130%] pointer-events-none select-none opacity-[0.045] hidden lg:block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/arche-symbol-blue.png" alt="" className="h-full w-auto" />
      </div>

      <Container className="relative flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center justify-end gap-4 pb-12 lg:pb-16 border-b border-[color:var(--color-hairline)]"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)]">
            Est. 2026
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col justify-center py-20 lg:py-32">
          <div className="max-w-[1200px]">
            <SplitText
              as="h1"
              text="Relações que geram confiança."
              className="font-serif text-[clamp(2.5rem,6vw,6rem)] leading-[0.98] tracking-[-0.03em] text-[color:var(--color-ink)]"
              stagger={0.04}
              splitBy="word"
            />
            <SplitText
              as="p"
              text="Estratégias que geram resultados."
              className="font-serif italic text-[clamp(2.5rem,6vw,6rem)] leading-[0.98] tracking-[-0.03em] text-[color:var(--color-brand)] block"
              stagger={0.04}
              splitBy="word"
              delay={0.35}
            />
            <SplitText
              as="p"
              text="Desde sua concepção, a Arché nasceu para construir relações duradouras, pautadas por confiança, proximidade e excelência. Unimos visão estratégica e conhecimento para transformar desafios em decisões seguras e oportunidades em resultados sustentáveis."
              className="text-[17px] lg:text-[20px] leading-[1.6] text-[color:var(--color-ink-muted)] block mt-8 lg:mt-10 max-w-[820px]"
              stagger={0.008}
              splitBy="word"
              delay={0.7}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 lg:mt-16 flex flex-col sm:flex-row flex-wrap items-start gap-3"
          >
            <Link
              href="/sobre"
              className="group inline-flex items-center gap-2 px-6 py-4 bg-[color:var(--color-brand)] text-white text-[13px] font-medium transition-all duration-300 hover:bg-[color:var(--color-brand-dim)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(27,42,92,0.45)]"
            >
              Quem somos
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/servicos"
              className="group inline-flex items-center gap-2 px-6 py-4 border border-[color:var(--color-ink)] text-[color:var(--color-ink)] text-[13px] font-medium transition-all duration-300 hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)] hover:-translate-y-0.5"
            >
              Como podemos apoiar
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/simulador"
              className="group inline-flex items-center gap-2 px-6 py-4 border border-[color:var(--color-ink)] text-[color:var(--color-ink)] text-[13px] font-medium transition-all duration-300 hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)] hover:-translate-y-0.5"
            >
              Simulador de eficiência tributária
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
