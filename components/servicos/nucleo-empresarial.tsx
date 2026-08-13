"use client";

import { motion } from "framer-motion";
import {
  Search,
  Target,
  PieChart,
  TrendingUp,
  Settings,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

/**
 * Núcleo Empresarial — Governança e Gestão Empresarial.
 * Espelha o material institucional Arché: 6 frentes, ícone em bloco navy.
 */

const SERVICOS = [
  {
    icon: Search,
    title: "Diagnóstico Organizacional",
    desc: "Análise profunda da situação financeira e estrutural da empresa para identificar gargalos, oportunidades e prioridades de gestão.",
  },
  {
    icon: TrendingUp,
    title: "Estruturação de Controles Financeiros",
    desc: "Fluxo de caixa gerencial, análise de custos, estrutura de precificação e organização financeira.",
  },
  {
    icon: Target,
    title: "Planejamento Estratégico",
    desc: "Definição de metas, indicadores e direcionamento para crescimento sustentável.",
  },
  {
    icon: Settings,
    title: "Estruturação de Processos",
    desc: "Organização de processos internos que trazem mais eficiência e previsibilidade operacional.",
  },
  {
    icon: PieChart,
    title: "Implantação de Indicadores (KPIs)",
    desc: "A empresa passa a acompanhar os números que realmente importam para a tomada de decisão.",
  },
  {
    icon: Shield,
    title: "Governança e Organização Administrativa",
    desc: "Estruturação da gestão para que o negócio funcione com mais clareza, controle e profissionalismo.",
  },
];

export function NucleoEmpresarial() {
  return (
    <section id="empresarial" className="scroll-mt-24 border-t border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]">
      <Container>
        <div className="py-24 lg:py-32">
          <Reveal>
            <Eyebrow>Núcleo Empresarial</Eyebrow>
            <h2 className="font-serif text-4xl lg:text-6xl leading-[0.98] tracking-tight text-[color:var(--color-ink)] mt-6 mb-6 max-w-3xl">
              Governança e Gestão
              <br />
              <span className="italic text-[color:var(--color-brand)]">Empresarial.</span>
            </h2>
            <p className="text-[16px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-2xl mb-16">
              Além do tributário: estruturamos a gestão para que o negócio cresça
              com clareza, controle e previsibilidade — do diagnóstico à governança.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
            {SERVICOS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % 2) * 0.08 + Math.floor(i / 2) * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="group bg-[color:var(--color-background)] p-8 lg:p-10 flex gap-6 hover:bg-[color:var(--color-paper-warm)] transition-colors duration-500"
              >
                <div className="w-14 h-14 shrink-0 bg-[color:var(--color-brand)] flex items-center justify-center transition-transform duration-500 group-hover:-translate-y-1">
                  <s.icon className="w-6 h-6 text-white" strokeWidth={1.4} />
                </div>
                <div>
                  <h3 className="font-serif text-xl lg:text-[22px] leading-tight text-[color:var(--color-ink)] mb-2.5">
                    {s.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[color:var(--color-ink-muted)]">
                    {s.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <Reveal>
            <Link
              href="/contato"
              className="group/cta mt-14 inline-flex items-center gap-2 text-[13px] font-mono uppercase tracking-[0.25em] text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)] transition-colors"
            >
              <span className="link-underline">Conversar sobre gestão e governança</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
