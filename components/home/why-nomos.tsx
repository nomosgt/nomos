"use client";

import { Container, Eyebrow } from "@/components/ui/section";
import { StaggerReveal, staggerItem } from "@/components/motion/reveal";
import { motion } from "framer-motion";

const DIFERENCIAIS = [
  {
    n: "01",
    title: "Pagamento por resultado",
    body:
      "Os honorários são devidos somente sobre o valor efetivamente recuperado. Não há retainer fixo nem honorário antecipado sobre tese ainda não confirmada.",
  },
  {
    n: "02",
    title: "Diagnóstico antes da contratação",
    body:
      "O potencial estimado, a classificação de risco de cada frente e o cronograma são apresentados antes da assinatura de qualquer contrato. Quando a análise não justifica a continuidade, isso é comunicado de forma direta.",
  },
  {
    n: "03",
    title: "Execução sem intermediação",
    body:
      "O profissional responsável pelo diagnóstico é o mesmo que conduz a execução do caso, do início ao fim, sem repasse a terceiros.",
  },
  {
    n: "04",
    title: "Acompanhamento contínuo",
    body:
      "Após a conclusão do primeiro ciclo, a equipe monitora jurisprudência, alterações legislativas e novas oportunidades de crédito aplicáveis à operação, de forma proativa.",
  },
];

export function WhyNomos() {
  return (
    <section className="py-28 lg:py-40 bg-[color:var(--color-surface)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Eyebrow>Compromissos contratuais</Eyebrow>
            <h2 className="mt-8 font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
              Quatro condições<br />
              <span className="italic text-[color:var(--color-brand)]">
                formalizadas
              </span><br />
              antes do início.
            </h2>
            <p className="mt-8 text-[15px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-sm">
              Cada item abaixo consta em contrato, não apenas em proposta comercial.
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
