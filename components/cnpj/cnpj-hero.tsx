"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/section";
import { SplitText } from "@/components/motion/split-text";

export function CnpjHero() {
  return (
    <section className="relative pt-32 lg:pt-40 pb-16 lg:pb-20 grain overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="font-mono text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-brand)] mb-10 flex items-center gap-3"
        >
          <span className="h-px w-10 bg-[color:var(--color-brand)]" />
          ◇ Análise tributária preliminar · IA
        </motion.div>

        <div className="max-w-4xl">
          <SplitText
            as="h1"
            text="Cole o CNPJ. Receba a leitura."
            className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight"
            splitBy="word"
            stagger={0.03}
          />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-10 text-[17px] lg:text-[18px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-2xl"
          >
            Em segundos, cruzamos os dados públicos da empresa com nossa
            metodologia de qualificação e devolvemos perfil tributário provável,
            teses aplicáveis ao setor e a próxima ação concreta — sem promessa
            vazia.
          </motion.p>
        </div>
      </Container>
    </section>
  );
}
// end of CnpjHero
