"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";

export function PostCTA() {
  return (
    <section className="py-28 lg:py-40 border-t border-[color:var(--color-hairline)]">
      <Container>
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 lg:gap-20 items-end">
            <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight max-w-3xl">
              Quer discutir esse tema<br />
              <span className="italic text-[color:var(--color-brand)]">na sua operação?</span>
            </h2>
            <div className="space-y-6">
              <p className="text-[16px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-md">
                Agende uma conversa sem custo. Olhamos a operação, identificamos
                aplicabilidade e devolvemos uma leitura honesta — mesmo que
                seja &ldquo;não vale a pena&rdquo;.
              </p>
              <Link
                href="/contato"
                className="group inline-flex items-center gap-2 px-6 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5"
              >
                Falar com a NOMOS
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
