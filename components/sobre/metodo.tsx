"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Container } from "@/components/ui/section";

const ETAPAS = [
  {
    n: "01",
    title: "Reunião Preliminar",
    body:
      "Primeiro contato técnico. Entendemos o porte, o regime tributário, o setor e os principais incômodos da operação.",
  },
  {
    n: "02",
    title: "NDA",
    body:
      "Assinatura de acordo de confidencialidade. Toda a discussão a partir daqui é protegida e fica restrita ao time técnico.",
  },
  {
    n: "03",
    title: "Envios & Habilitação",
    body:
      "Coleta da documentação fiscal-contábil dos últimos 60 meses e habilitação dos acessos necessários para o diagnóstico.",
  },
  {
    n: "04",
    title: "Análise Estratégica",
    body:
      "Diagnóstico técnico: quais teses aplicam, qual o potencial real de recuperação e qual o risco classificado de cada frente.",
  },
  {
    n: "05",
    title: "Apresentação Estratégica",
    body:
      "Devolutiva executiva para CEO/CFO: números, riscos, prazos e ordem de prioridades. Decisão com base em fato, não em achismo.",
  },
  {
    n: "06",
    title: "Assinatura do Contrato",
    body:
      "Modelo de remuneração alinhado a resultado. Você só paga se o caixa chegar — sem retainer disfarçado, sem letra miúda.",
  },
  {
    n: "07",
    title: "Desenvolvimento & Atualização",
    body:
      "Execução com cronograma claro e relatórios periódicos. Acompanhamento contínuo da operação enquanto o crédito é recuperado.",
  },
];

export function Metodo() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 60%"],
  });
  // Linha cresce de 0 → 100% conforme o scroll progride pela timeline
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="py-28 lg:py-40 bg-[color:var(--color-surface)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-24 items-end mb-20">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-[color:var(--color-brand)]" />
              Jornada do cliente
            </div>
            <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
              Sete etapas de<br />
              <span className="italic text-[color:var(--color-brand)]">
                segurança e validação.
              </span>
            </h2>
          </div>
          <p className="text-[16px] lg:text-[17px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-lg lg:justify-self-end">
            Da análise inicial ao êxito da operação. Cada etapa existe
            para alinhar com a equipe do cliente e dar segurança
            à recuperação — claro, previsível e mensurável em qualquer ponto.
          </p>
        </div>

        <div ref={ref} className="relative">
          {/* Linha de fundo (cinza claro) */}
          <div
            aria-hidden
            className="absolute left-[7px] lg:left-[11px] top-2 bottom-2 w-px bg-[color:var(--color-hairline)]"
          />
          {/* Linha animada azul brand — cresce conforme scroll */}
          <motion.div
            aria-hidden
            className="absolute left-[7px] lg:left-[11px] top-2 w-px bg-[color:var(--color-brand)] origin-top"
            style={{ height: lineHeight }}
          />

          <div className="space-y-10 lg:space-y-14">
            {ETAPAS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="relative pl-10 lg:pl-16 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 lg:gap-12 group"
              >
                {/* Dot da etapa — pulsa quando entra em view */}
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, margin: "-15%" }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.05 + 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="absolute left-0 top-2 w-4 h-4 lg:w-6 lg:h-6 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-ink)] flex items-center justify-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut",
                    }}
                    className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-[color:var(--color-brand)]"
                  />
                </motion.div>

                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-3">
                    Etapa {s.n} / 07
                  </div>
                  <h3 className="font-serif text-3xl lg:text-4xl tracking-tight text-[color:var(--color-ink)] transition-transform duration-500 group-hover:translate-x-2">
                    {s.title}
                  </h3>
                </div>
                <p className="text-[15px] lg:text-[16px] leading-[1.6] text-[color:var(--color-ink-muted)] max-w-xl">
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
// end of Metodo
