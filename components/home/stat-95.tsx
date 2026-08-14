"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Scale, Briefcase, Cpu } from "lucide-react";
import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

/**
 * Stat 95% + Dois Núcleos — espelha o material institucional Arché.
 * "95% das empresas pagam mais tributos do que deveriam no Brasil"
 * + apresentação do Núcleo Tributário e do Núcleo Empresarial.
 */

const NUCLEOS = [
  {
    icon: Scale,
    tag: "Núcleo Tributário",
    title: "Recuperação e otimização de créditos",
    desc: "Análises especializadas e atuação judicial e administrativa em PIS/COFINS, ICMS, ISS, IRPJ e CSLL — fundamentadas na legislação e nos Tribunais Superiores.",
    href: "/servicos",
  },
  {
    icon: Briefcase,
    tag: "Núcleo Empresarial",
    title: "Governança e gestão empresarial",
    desc: "Diagnóstico organizacional, planejamento estratégico, KPIs, controles financeiros e estruturação de processos para crescer com previsibilidade.",
    href: "/servicos#empresarial",
  },
  {
    icon: Cpu,
    tag: "Núcleo de Tecnologia",
    title: "Plataforma única e IA aplicada",
    desc: "Simulador proprietário, Sala do Cliente com acompanhamento em tempo real e inteligência artificial a serviço da expertise — do diagnóstico ao resultado.",
    href: "/servicos#tecnologia",
  },
];

export function Stat95() {
  return (
    <section className="relative border-t border-[color:var(--color-hairline)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)] overflow-hidden">
      {/* Barras diagonais da marca como arte de fundo */}
      <div className="absolute inset-y-0 right-0 w-1/2 opacity-[0.05] pointer-events-none" aria-hidden>
        <svg viewBox="0 0 95 100" className="h-full w-auto ml-auto" preserveAspectRatio="xMaxYMid slice">
          <polygon points="0,100 17,100 45,0 28,0" fill="currentColor" />
          <polygon points="25,100 42,100 70,0 53,0" fill="currentColor" />
          <polygon points="50,100 67,100 95,0 78,0" fill="currentColor" />
        </svg>
      </div>

      <Container>
        <div className="relative py-24 lg:py-32">
          <Reveal>
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-paper-dim)] mb-8">
              Você sabia?
            </div>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-16 items-end mb-20 lg:mb-28">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif leading-none tracking-tight text-[clamp(6rem,16vw,14rem)]"
            >
              95<span className="text-[color:var(--color-accent)]">%</span>
            </motion.div>
            <Reveal>
              <p className="font-serif text-2xl lg:text-4xl leading-[1.25] max-w-xl pb-4">
                das empresas pagam mais tributos do que deveriam no Brasil.
              </p>
              <Link
                href="/simulador"
                className="group inline-flex items-center gap-2 text-[13px] font-mono uppercase tracking-[0.25em] text-[color:var(--color-paper-dim)] hover:text-[color:var(--color-paper)] transition-colors"
              >
                <span className="link-underline">Descubra se a sua é uma delas</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Reveal>
          </div>

          {/* Três núcleos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--color-paper)]/10 border border-[color:var(--color-paper)]/10">
            {NUCLEOS.map((n, i) => (
              <motion.div
                key={n.tag}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={n.href}
                  className="group block h-full bg-[color:var(--color-ink)] p-8 lg:p-12 hover:bg-[color:var(--color-brand-dim)] transition-colors duration-500"
                >
                  <div className="flex items-center justify-between mb-10">
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-accent-soft)]">
                      {n.tag}
                    </div>
                    <n.icon className="w-6 h-6 text-[color:var(--color-paper-dim)] group-hover:text-[color:var(--color-paper)] transition-colors" strokeWidth={1.3} />
                  </div>
                  <h3 className="font-serif text-2xl lg:text-3xl leading-tight mb-4">
                    {n.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[color:var(--color-paper-dim)] mb-8">
                    {n.desc}
                  </p>
                  <span className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.25em] text-[color:var(--color-paper-dim)] group-hover:text-[color:var(--color-paper)] transition-colors">
                    Conhecer o núcleo
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
