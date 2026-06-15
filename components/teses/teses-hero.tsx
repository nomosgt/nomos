"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/section";
import { SplitText } from "@/components/motion/split-text";
import { Sparkles } from "lucide-react";

export function TesesHero() {
  return (
    <section className="relative pt-40 lg:pt-48 pb-12 lg:pb-16 grain overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-16"
        >
          <span className="text-[color:var(--color-brand)]">/ Banco de Teses</span>
          <span className="h-px w-12 bg-[color:var(--color-hairline)]" />
          Biblioteca técnica
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12 lg:gap-20 items-end">
          <SplitText
            as="h1"
            text="Cada tese, mapeada."
            className="font-serif text-display-lg lg:text-display-xl leading-[0.95] tracking-tight"
            splitBy="word"
            stagger={0.04}
          />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.9 }}
            className="space-y-4"
          >
            <p className="text-[16px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md">
              Biblioteca das principais teses tributárias acompanhadas pela
              NOMOS — com status, base jurídica e análise técnica de cada uma.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/5 text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-brand)]">
              <Sparkles className="w-3 h-3" />
              Análise atualizada por IA
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
