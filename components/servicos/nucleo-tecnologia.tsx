"use client";

import { motion } from "framer-motion";
import {
  Gauge,
  LayoutDashboard,
  Handshake,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

/**
 * Núcleo de Tecnologia — diferencial Arché.
 * Plataforma única: simulador proprietário, sala do cliente,
 * central do parceiro e IA aplicada.
 */

const FRENTES = [
  {
    icon: Gauge,
    title: "Simulador proprietário",
    desc: "Estimativa de recuperação em minutos, com três cenários (pessimista, base, otimista), fundamentada em legislação, jurisprudência e casos reais.",
  },
  {
    icon: LayoutDashboard,
    title: "Sala do Cliente",
    desc: "Acompanhamento em tempo real das 7 etapas do processo, documentos, mensagens e suporte — tudo num só lugar, com acesso individual.",
  },
  {
    icon: Handshake,
    title: "Central do Parceiro",
    desc: "Projetos, demandas, prazos e comissões dos parceiros em painel dedicado, com código de acesso exclusivo gerado pela Arché.",
  },
  {
    icon: Sparkles,
    title: "Inteligência artificial aplicada",
    desc: "Análise de perfil por CNPJ, insights de operação e priorização inteligente — a IA potencializa a expertise dos especialistas, não a substitui.",
  },
  {
    icon: ShieldCheck,
    title: "Dados e segurança",
    desc: "Infraestrutura em nuvem, dados públicos oficiais (Receita Federal) e benchmarks do nosso próprio banco de clientes por segmento.",
  },
];

export function NucleoTecnologia() {
  return (
    <section
      id="tecnologia"
      className="scroll-mt-24 relative border-t border-[color:var(--color-hairline)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)] overflow-hidden"
    >
      {/* Barras oficiais como marca d'água */}
      <div
        aria-hidden
        className="absolute -left-16 bottom-0 h-[120%] pointer-events-none select-none opacity-[0.04]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/arche-symbol-white.png" alt="" className="h-full w-auto" />
      </div>

      <Container>
        <div className="relative py-24 lg:py-32">
          <Reveal>
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-accent-soft)] mb-6">
              Núcleo de Tecnologia
            </div>
            <h2 className="font-serif text-4xl lg:text-6xl leading-[0.98] tracking-tight mb-6 max-w-3xl">
              Uma plataforma única,
              <br />
              <span className="italic text-[color:var(--color-brand-soft)]">do diagnóstico ao resultado.</span>
            </h2>
            <p className="text-[16px] leading-relaxed text-[color:var(--color-paper-dim)] max-w-2xl mb-16">
              Na Arché, tecnologia potencializa a expertise dos nossos especialistas:
              inteligência de dados e conhecimento tributário para identificar, com
              agilidade e precisão, o potencial da sua empresa — e acompanhar cada
              etapa em tempo real.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--color-paper)]/10 border border-[color:var(--color-paper)]/10">
            {FRENTES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="group bg-[color:var(--color-ink)] p-8 lg:p-10 hover:bg-[color:var(--color-brand-dim)] transition-colors duration-500"
              >
                <f.icon
                  className="w-7 h-7 mb-8 text-[color:var(--color-brand-soft)] group-hover:text-[color:var(--color-paper)] transition-colors"
                  strokeWidth={1.3}
                />
                <h3 className="font-serif text-xl lg:text-[22px] leading-tight mb-2.5">
                  {f.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-[color:var(--color-paper-dim)]">
                  {f.desc}
                </p>
              </motion.div>
            ))}

            {/* Card CTA fechando o grid */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: 0.24, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href="/simulador"
                className="group flex flex-col justify-between h-full bg-[color:var(--color-brand)] p-8 lg:p-10 hover:bg-[color:var(--color-brand-dim)] transition-colors duration-500"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/70 mb-8">
                  Experimente agora
                </div>
                <div>
                  <h3 className="font-serif text-xl lg:text-[22px] leading-tight mb-4 text-white">
                    Simule o potencial da sua empresa em minutos.
                  </h3>
                  <span className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.25em] text-white/80 group-hover:text-white transition-colors">
                    Abrir simulador
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
