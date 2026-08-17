"use client";

import { motion } from "framer-motion";
import { Container, Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

/**
 * Método Arché — 5 etapas com rastreabilidade do diagnóstico ao resultado.
 * Copy conforme briefing 101 do Éverton.
 */

const ETAPAS = [
  {
    n: "01",
    title: "Entenda",
    desc: "Conhecemos a empresa, a operação e o contexto.",
  },
  {
    n: "02",
    title: "Diagnóstico",
    desc: "Mapeamos riscos, ineficiências e oportunidades.",
  },
  {
    n: "03",
    title: "Validar",
    desc: "Especialistas analisam evidências e aplicabilidade — alinhando entre os nossos especialistas e os decisores da empresa.",
  },
  {
    n: "04",
    title: "Implantar",
    desc: "Transformamos estratégia em ação.",
  },
  {
    n: "05",
    title: "Monitorar",
    desc: "Da implantação ao andamento dos procedimentos, tudo acompanhado pela nossa equipe — atentos a mudanças e novas oportunidades.",
  },
];

export function MetodoArche() {
  return (
    <section className="border-t border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]">
      <Container>
        <div className="py-24 lg:py-32">
          <Reveal>
            <Eyebrow>Método Arché</Eyebrow>
            <h2 className="mt-8 font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight max-w-4xl">
              Método antes de opinião.
              <br />
              <span className="italic text-[color:var(--color-brand)]">
                Evidência antes de decisão.
              </span>
            </h2>
            <p className="mt-6 text-[16px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-xl">
              Uma metodologia clara cria rastreabilidade do diagnóstico ao
              resultado.
            </p>
          </Reveal>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
            {ETAPAS.map((e, i) => (
              <motion.div
                key={e.n}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[color:var(--color-background)] p-7 lg:p-8"
              >
                <div className="font-mono text-[10px] tracking-[0.3em] text-[color:var(--color-accent)] mb-8">
                  {e.n}
                </div>
                <h3 className="font-serif text-xl lg:text-2xl text-[color:var(--color-ink)] mb-3">
                  {e.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                  {e.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <Reveal>
            <p className="mt-12 font-serif text-xl lg:text-2xl leading-snug text-[color:var(--color-ink)] max-w-3xl">
              Segurança antes da oportunidade. Evidência antes da decisão.{" "}
              <span className="italic text-[color:var(--color-brand)]">
                Resultado como consequência de um método.
              </span>
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
