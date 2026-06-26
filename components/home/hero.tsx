"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
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

      <Container className="relative flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center justify-between gap-4 pb-12 lg:pb-16 border-b border-[color:var(--color-hairline)]"
        >
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)]">
            <span className="h-px w-8 bg-[color:var(--color-brand)]" />
            Gestão Tributária · São Paulo
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)]">
            Est. 2025
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col justify-center py-20 lg:py-32">
          <div className="max-w-[1200px]">
            <SplitText
              as="h1"
              text="Conheça a NOMOS GT"
              className="font-serif text-[clamp(2.75rem,7vw,7rem)] leading-[0.95] tracking-[-0.035em] text-[color:var(--color-ink)]"
              stagger={0.04}
              splitBy="word"
            />
            <SplitText
              as="p"
              text="A união entre segurança jurídica e inteligência tributária que protege, fortalece e posiciona sua empresa com mais competitividade no mercado."
              className="font-serif italic text-[clamp(1.5rem,3.2vw,3rem)] leading-[1.15] tracking-tight text-[color:var(--color-brand)] block mt-6 lg:mt-8 max-w-[1100px]"
              stagger={0.018}
              splitBy="word"
              delay={0.5}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 lg:mt-16 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-20 items-end"
          >
            <p className="max-w-xl text-[17px] lg:text-[19px] leading-[1.55] text-[color:var(--color-ink-muted)]">
              Atuação técnica em consultoria, contencioso e administrativo,
              para empresas que buscam segurança jurídica antes de agir:
              identificamos o crédito, construímos a tese e conduzimos a
              recuperação do início ao fim, ajustando a operação para que a
              empresa pague menos no futuro.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 lg:justify-end">
              <Link
                href="/contato"
                className="group inline-flex items-center gap-2 px-6 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(14,21,37,0.4)]"
              >
                Agendar diagnóstico
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/simulador"
                className="group inline-flex items-center gap-2 px-6 py-4 border border-[color:var(--color-ink)] text-[color:var(--color-ink)] text-[13px] font-medium transition-all duration-300 hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)] hover:-translate-y-0.5"
              >
                Estimar potencial de recuperação
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
          className="flex items-end justify-between gap-6 pt-10 border-t border-[color:var(--color-hairline)]"
        >
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)]">
            <ArrowDown className="w-3 h-3 animate-bounce" />
            Role para explorar
          </div>
          <div className="hidden md:flex items-center gap-8 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)]">
            <span>Consultoria · Ações Judiciais · Via Administrativa</span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
