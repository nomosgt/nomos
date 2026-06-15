"use client";

import Link from "next/link";
import { Container } from "@/components/ui/section";
import { ArrowUpRight } from "lucide-react";
import type { BlogPost } from "@/lib/validation/blog";

export function RelatedPosts({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="py-20 lg:py-28 bg-[color:var(--color-surface)] border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-10">
          / Leia também
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group bg-[color:var(--color-background)] p-8 hover:bg-[color:var(--color-paper-warm)] transition-colors"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mb-5">
                {p.categoria}
              </div>
              <h3 className="font-serif text-xl lg:text-2xl leading-tight tracking-tight text-[color:var(--color-ink)] mb-6 group-hover:text-[color:var(--color-brand-dim)] transition-colors">
                {p.title}
              </h3>
              <div className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)]">
                Ler análise
                <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
// end of RelatedPosts
