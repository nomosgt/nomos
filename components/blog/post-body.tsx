"use client";

import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import type { BlogPost } from "@/lib/validation/blog";

export function PostBody({ post }: { post: BlogPost; related?: BlogPost[] }) {
  // Body é markdown simples — split em paragraphs por linhas em branco
  const paragraphs = post.body.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  return (
    <section className="py-16 lg:py-24 border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 lg:gap-24">
          <article className="space-y-8">
            {paragraphs.map((paragraph, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <p
                  className={`leading-[1.7] text-[color:var(--color-ink)] whitespace-pre-wrap ${
                    i === 0
                      ? "font-serif text-2xl lg:text-3xl leading-[1.35]"
                      : "text-[17px]"
                  }`}
                >
                  {paragraph}
                </p>
              </Reveal>
            ))}
          </article>

          <aside className="lg:sticky lg:top-32 lg:self-start space-y-10">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-4">
                ✦ Tempo de leitura
              </div>
              <div className="font-mono text-3xl text-[color:var(--color-ink)]">
                {post.read_time} min
              </div>
            </div>

            <div className="border-t border-[color:var(--color-hairline)] pt-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-4">
                Sobre o autor
              </div>
              <p className="text-[14px] leading-relaxed text-[color:var(--color-ink-muted)]">
                Éverton Vicente é fundador da NOMOS GT e atua em direito
                tributário há mais de uma década. Recuperou mais de R$ 100
                milhões em créditos para clientes.
              </p>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
// end of PostBody
