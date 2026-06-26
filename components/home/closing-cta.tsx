"use client";

import Link from "next/link";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";

export function ClosingCTA() {
  return (
    <section className="py-28 lg:py-44">
      <Container>
        <Eyebrow>Próximo passo</Eyebrow>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 lg:gap-20 items-end">
          <SplitText
            as="h2"
            text="Conheça em detalhe a sua operação tributária."
            className="font-serif text-display-md lg:text-display-xl leading-[0.95] tracking-tight"
            stagger={0.035}
            splitBy="word"
          />

          <Reveal delay={0.3}>
            <p className="text-[16px] lg:text-[17px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md">
              Uma conversa inicial, sem compromisso, para compreender o cenário
              da empresa e avaliar, de forma transparente, a pertinência de
              prosseguir com um diagnóstico técnico.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.4} className="mt-16 lg:mt-20">
          <div className="flex flex-wrap items-stretch gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
            <Link
              href="/contato"
              className="group flex-1 min-w-[260px] bg-[color:var(--color-background)] p-8 lg:p-10 hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)] transition-all duration-500"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4">
                Agendar
              </div>
              <div className="flex items-center justify-between">
                <span className="font-serif text-2xl lg:text-3xl">
                  Agendar diagnóstico
                </span>
                <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </Link>

            <Link
              href="mailto:contato@nomosgt.com.br"
              className="group bg-[color:var(--color-background)] p-8 lg:p-10 hover:bg-[color:var(--color-surface)] transition-all duration-500"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4 flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email
              </div>
              <div className="font-serif text-xl lg:text-2xl">
                contato@nomosgt.com.br
              </div>
            </Link>

            <Link
              href="https://wa.me/5511933333841"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[color:var(--color-background)] p-8 lg:p-10 hover:bg-[color:var(--color-surface)] transition-all duration-500"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4 flex items-center gap-2">
                <Phone className="w-3 h-3" /> WhatsApp
              </div>
              <div className="font-serif text-xl lg:text-2xl">
                +55 11 93333-3841
              </div>
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
