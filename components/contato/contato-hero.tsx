"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/section";
import { SplitText } from "@/components/motion/split-text";

export function ContatoHero() {
  return (
    <section className="relative pt-40 lg:pt-48 pb-8 lg:pb-12 grain overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-16"
        >
          <span className="text-[color:var(--color-brand)]">/ Contato</span>
          <span className="h-px w-12 bg-[color:var(--color-hairline)]" />
          Vamos conversar
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20 items-end">
          <SplitText
            as="h1"
            text="Diga olá."
            className="font-serif text-display-xl lg:text-display-2xl leading-[0.9] tracking-tight"
            splitBy="word"
            stagger={0.05}
          />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.9 }}
            className="text-[17px] leading-[1.55] text-[color:var(--color-ink-muted)] max-w-md"
          >
            Toda relação técnica começa com uma conversa direta. Sem
            apresentação comercial, sem promessa vazia — você fala da sua
            operação, a gente devolve uma leitura honesta.
          </motion.p>
        </div>
      </Container>
    </section>
  );
}
