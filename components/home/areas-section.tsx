"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Scale, Gavel, FileSearch } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

const PILARES = [
  {
    icon: Scale,
    tag: "Pilar I",
    title: "Consultoria Tributária",
    description:
      "Diagnóstico contínuo + transação tributária federal. Mapeia risco antes de virar autuação.",
    href: "/servicos#consultoria",
  },
  {
    icon: Gavel,
    tag: "Pilar II",
    title: "Ações Judiciais de Recuperação",
    description:
      "Teses STF/STJ aplicáveis à sua operação — recuperação retroativa de até 5 anos.",
    href: "/servicos#judicial",
  },
  {
    icon: FileSearch,
    tag: "Pilar III",
    title: "Recuperação Administrativa",
    description:
      "PER/DCOMP, monofásico, LC 160/2017, Tema 779. Devolução direta, sem judicialização.",
    href: "/servicos#administrativa",
  },
];

export function AreasSection() {
  return (
    <section className="py-28 lg:py-40">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-end mb-20 lg:mb-28">
          <div>
            <Eyebrow>Pilares NGT</Eyebrow>
            <h2 className="mt-8 font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
              Três frentes.<br />
              <span className="italic text-[color:var(--color-brand)]">Uma só leitura técnica.</span>
            </h2>
          </div>
          <p className="text-[16px] lg:text-[17px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md lg:justify-self-end">
            Três caminhos para chegar ao mesmo destino: caixa de volta para
            quem produz. O ponto de partida depende do estágio da sua
            operação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-[color:var(--color-hairline)]">
          {PILARES.map((p, i) => (
            <Reveal key={p.tag} delay={i * 0.08}>
              <Link
                href={p.href}
                className="group relative block p-8 lg:p-12 border-r border-b border-[color:var(--color-hairline)] h-full transition-colors duration-500 hover:bg-[color:var(--color-surface)]"
              >
                <div className="flex items-start justify-between mb-12 lg:mb-16">
                  <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-brand)]">
                    {p.tag}
                  </div>
                  <div className="relative">
                    <p.icon
                      className="w-6 h-6 text-[color:var(--color-ink)] transition-all duration-500 group-hover:text-[color:var(--color-brand)] group-hover:rotate-[8deg]"
                      strokeWidth={1.2}
                    />
                  </div>
                </div>

                <h3 className="font-serif text-3xl lg:text-4xl leading-tight tracking-tight text-[color:var(--color-ink)] mb-5">
                  {p.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md mb-10">
                  {p.description}
                </p>

                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink)] transition-colors group-hover:text-[color:var(--color-brand)]">
                  <span className="link-underline">Ver detalhes</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>

                <motion.div className="absolute bottom-0 left-0 right-0 h-px bg-[color:var(--color-brand)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
