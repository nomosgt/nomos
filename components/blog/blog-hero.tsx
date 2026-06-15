"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/section";
import { SplitText } from "@/components/motion/split-text";

export function BlogHero() {
  return (
    <section className="relative pt-40 lg:pt-48 pb-12 lg:pb-16 grain overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-16"
        >
          <span className="text-[color:var(--color-brand)]">/ Blog</span>
          <span className="h-px w-12 bg-[color:var(--color-hairline)]" />
          Análises técnicas
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12 lg:gap-20 items-end">
          <SplitText
            as="h1"
            text="O que vale a pena ler."
            className="font-serif text-display-lg lg:text-display-xl leading-[0.95] tracking-tight"
            splitBy="word"
            stagger={0.04}
          />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.9 }}
            className="text-[16px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md"
          >
            Análises técnicas, atualizações jurisprudenciais e cases de
            execução. Sem chavão, sem post de SEO genérico — só conteúdo que um
            CFO consegue usar.
          </motion.p>
        </div>
      </Container>
    </section>
  );
}
