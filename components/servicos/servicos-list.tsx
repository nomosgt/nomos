"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Scale, Gavel, FileSearch } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

const PILARES = [
  {
    id: "consultoria",
    icon: Scale,
    tag: "Pilar I",
    title: "Consultoria Tributária",
    short:
      "Atuação em transação tributária de débitos federais e planejamento contínuo para destravar oportunidades sem aumentar exposição fiscal.",
    bullets: [
      "Transação tributária de débitos federais (PGFN e RFB)",
      "Planejamento tributário lícito e técnico",
      "Mapeamento de riscos e contingências fiscais",
      "Acompanhamento da reforma tributária e mudanças legislativas",
      "Pareceres sob demanda e segunda opinião técnica",
    ],
  },
  {
    id: "judicial",
    icon: Gavel,
    tag: "Pilar II",
    title: "Ações Judiciais de Recuperação de Créditos",
    short:
      "Recuperação via judicial com base em teses consolidadas pelo STF e STJ — devolução retroativa dos últimos 5 anos.",
    bullets: [
      "Exclusão do ICMS da base do PIS/COFINS — Tema 69, STF",
      "Exclusão do ISS da base do PIS/COFINS — Tema 118, STF",
      "Exclusão do PIS/COFINS da própria base — Tema 1067, STF",
      "Exclusão do ICMS/ISS da base do IRPJ e CSLL — Repetitivo nº 1.008, STF",
      "Ilegalidade do ICMS nas faturas de energia elétrica — Tema 986, STJ / Tema 176, STF",
      "PAT — Dedução do IRPJ",
      "Revisão de ilegalidades em parcelamentos",
      "Contribuições previdenciárias sobre verbas indenizatórias",
      "Acesso ao SINCOR",
      "Limitação de 20 salários-mínimos — contribuições a terceiros (Tema 1.079, STJ)",
      "Exclusão de bonificações da base do ICMS",
      "Créditos de IPI sobre insumos da Zona Franca de Manaus — Tema 322, STF",
    ],
  },
  {
    id: "administrativa",
    icon: FileSearch,
    tag: "Pilar III",
    title: "Recuperação de Créditos — Via Administrativa",
    short:
      "Identificação e retomada de créditos pagos indevidamente, executada diretamente na via administrativa — sem dependência do Judiciário.",
    bullets: [
      "Créditos de PIS/COFINS sobre produtos de regime monofásico",
      "Aproveitamento dos benefícios da Lei Complementar 160/2017",
      "Auditoria do sistema de apuração e cruzamento de obrigações acessórias",
      "Créditos de PIS/COFINS sobre insumos conforme novo critério do STJ — Tema 779",
    ],
  },
];

export function ServicosList() {
  return (
    <section className="border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="divide-y divide-[color:var(--color-hairline)]">
          {PILARES.map((p) => (
            <div key={p.id} id={p.id} className="scroll-mt-32">
              <Reveal>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-24 py-20 lg:py-28 group">
                  {/* Left: tag + icon + title */}
                  <div className="lg:sticky lg:top-32 lg:self-start">
                    <div className="flex items-start justify-between mb-12">
                      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)]">
                        {p.tag}
                      </div>
                      <p.icon
                        className="w-7 h-7 text-[color:var(--color-ink)] transition-transform duration-700 group-hover:rotate-[8deg] group-hover:text-[color:var(--color-brand)]"
                        strokeWidth={1.2}
                      />
                    </div>
                    <h2 className="font-serif text-4xl lg:text-5xl leading-[0.95] tracking-tight text-[color:var(--color-ink)]">
                      {p.title}
                    </h2>
                  </div>

                  {/* Right: description + bullets */}
                  <div>
                    <p className="font-serif text-2xl lg:text-3xl leading-[1.3] text-[color:var(--color-ink)] mb-12">
                      {p.short}
                    </p>

                    <div className="border-t border-[color:var(--color-hairline)] pt-8">
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-6">
                        O que entra
                      </div>
                      <ul className="space-y-4">
                        {p.bullets.map((b, j) => (
                          <motion.li
                            key={j}
                            initial={{ opacity: 0, x: -8 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: j * 0.04, duration: 0.55 }}
                            className="flex items-start gap-4 text-[15px] leading-relaxed text-[color:var(--color-ink-muted)]"
                          >
                            <span className="text-[color:var(--color-brand)] mt-2 leading-none">
                              ◇
                            </span>
                            <span>{b}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href="/contato"
                      className="group/cta mt-12 inline-flex items-center gap-2 text-[13px] font-mono uppercase tracking-[0.25em] text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)] transition-colors"
                    >
                      <span className="link-underline">Conversar sobre esse pilar</span>
                
      <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
