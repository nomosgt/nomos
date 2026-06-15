"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/section";
import { SplitText } from "@/components/motion/split-text";

export function SobreHero() {
  return (
    <section className="relative pt-40 lg:pt-48 pb-20 lg:pb-32 grain overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-16"
        >
          <span className="text-[color:var(--color-brand)]">/ Sobre</span>
          <span className="h-px w-12 bg-[color:var(--color-hairline)]" />
          O escritório e seu fundador
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-16 items-end">
          <div>
            <SplitText
              as="h1"
              text="Éverton Vicente."
              className="font-serif text-display-lg lg:text-display-xl leading-[0.95] tracking-tight"
              splitBy="word"
              stagger={0.04}
            />
            <SplitText
              as="h1"
              text="A leitura técnica por trás da NOMOS."
              className="block mt-3 font-serif italic text-display-md lg:text-display-lg leading-[0.95] tracking-tight text-[color:var(--color-brand)]"
              splitBy="word"
              stagger={0.04}
              delay={0.5}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.9 }}
            className="space-y-6"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)]">
              CEO e Fundador · Advogado
            </div>
            <div className="space-y-1">
              <div className="text-[14px] text-[color:var(--color-ink)]">
                Bacharel em Direito — USF
              </div>
              <div className="text-[14px] text-[color:var(--color-ink)]">
                Pós em Direito Tributário — FAVI
              </div>
              <div className="text-[14px] text-[color:var(--color-ink-muted)]">
                +R$ 100M em créditos recuperados
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
