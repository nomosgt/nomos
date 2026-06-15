"use client";

import { Container, Eyebrow } from "@/components/ui/section";
import { StaggerReveal, staggerItem } from "@/components/motion/reveal";
import { motion } from "framer-motion";

const DIFERENCIAIS = [
  {
    n: "01",
    title: "Pagamento por resultado",
    body:
      "Você só paga se o caixa chegar. Sem retainer fixo, sem letra miúda, sem honorário antecipado em tese que ainda não voltou para sua operação.",
  },
  {
    n: "02",
    title: "Diagnóstico antes da venda",
    body:
      "Mostramos o potencial estimado, o risco classificado de cada frente e o cronograma — antes de qualquer contrato. Se não fizer sentido, dizemos.",
  },
  {
    n: "03",
    title: "Sem terceirização interna",
    body:
      "O técnico que diagnostica é o mesmo que executa. Sem repasse, sem júnior assinando o que sócio prometeu, sem perder o fio da operação.",
  },
  {
    n: "04",
    title: "Acompanhamento contínuo",
    body:
      "Após o primeiro ciclo, monitoramos jurisprudência, mudanças legislativas e novos créditos da sua operação — sem você ter que pedir.",
  },
];

export function WhyNomos() {
  return (
    <section className="py-28 lg:py-40 bg-[color:var(--color-surface)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Eyebrow>O que muda com a NGT</Eyebrow>
            <h2 className="mt-8 font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
              Quatro promessas<br />
              <span className="italic text-[color:var(--color-brand)]">
                que entregamos
              </span><br />
              em contrato.
            </h2>
            <p className="mt-8 text-[15px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-sm">
              O mercado tributário é cheio de promessa. Aqui, cada compromisso
              vai por escrito antes da gente começar.
            </p>
          </div>

          <StaggerReveal className="divide-y divide-[color:var(--color-hairline)] border-t border-[color:var(--color-hairline)]">
            {DIFERENCIAIS.map((p) => (
              <motion.div
                key={p.n}
                variants={staggerItem}
                className="group grid grid-cols-[auto_1fr] gap-8 lg:gap-12 py-10 lg:py-14 cursor-default"
              >
                <div className="font-mono text-[12px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] pt-2">
                  / {p.n}
                </div>
                <div>
                  <h3 className="font-serif text-3xl lg:text-4xl tracking-tight text-[color:var(--color-ink)] mb-4 transition-transform duration-500 group-hover:translate-x-2">
                    {p.title}
                  </h3>
                  <p className="text-[16px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-xl">
                    {p.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </StaggerReveal>
        </div>
      </Container>
    </section>
  );
}
// end of WhyNomos
