"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/section";
import { SplitText } from "@/components/motion/split-text";

export function ServicosHero() {
  return (
    <section className="relative pt-40 lg:pt-48 pb-20 lg:pb-32 grain overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-16"
        >
          <span className="text-[color:var(--color-brand)]">/ Serviços</span>
          <span className="h-px w-12 bg-[color:var(--color-hairline)]" />
          Áreas de atuação
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-16 items-end">
          <SplitText
            as="h1"
            text="Todo o ciclo tributário da empresa."
            className="font-serif text-display-lg lg:text-display-xl leading-[0.95] tracking-tight"
            splitBy="word"
            stagger={0.04}
          />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.9 }}
            className="text-[17px] leading-[1.55] text-[color:var(--color-ink-muted)] max-w-md"
          >
            Do diagnóstico inicial à execução das teses, da defesa em execuções
            fiscais à regularização cadastral. Cada frente conduzida com a mesma
            leitura técnica.
          </motion.p>
        </div>
      </Container>
    </section>
  );
}
