"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

export function ServicosCTA() {
  return (
    <section className="py-28 lg:py-40 bg-[color:var(--color-ink)] text-[color:var(--color-paper)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12 lg:gap-20 items-end">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-paper)]/50 mb-12 flex items-center gap-3">
              <span className="h-px w-12 bg-[color:var(--color-brand-soft)]" />
              Próximo passo
            </div>
            <Reveal>
              <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
                Sua operação tem mais<br />
                <span className="italic text-[color:var(--color-brand-soft)]">
                  caixa do que aparenta.
                </span>
              </h2>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="space-y-6">
              <p className="text-[17px] leading-relaxed text-[color:var(--color-paper)]/70 max-w-md">
                Uma primeira conversa, sem custo, pra entender se faz sentido a
                NOMOS olhar sua operação tributária.
              </p>
              <Link
                href="/contato"
                className="group inline-flex items-center gap-2 px-6 py-4 bg-[color:var(--color-background)] text-[color:var(--color-ink)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5"
              >
                Agendar conversa
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
