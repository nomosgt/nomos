"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/section";
import { SplitText } from "@/components/motion/split-text";
import type { BlogPost } from "@/lib/validation/blog";

const formatDate = (date: string | null | undefined) =>
  date
    ? new Date(date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

export function PostHero({ post }: { post: BlogPost }) {
  return (
    <section className="relative pt-32 lg:pt-40 pb-16 lg:pb-24 grain overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
            Voltar para o blog
          </Link>
        </motion.div>

        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="flex items-center gap-3 mb-10 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)]"
          >
            <span className="text-[color:var(--color-brand)]">{post.categoria}</span>
            <span>·</span>
            <span>{formatDate(post.published_at)}</span>
            <span>·</span>
            <span>{post.read_time} min de leitura</span>
          </motion.div>

          <SplitText
            as="h1"
            text={post.title}
            className="font-serif text-display-md lg:text-display-lg leading-[0.98] tracking-tight"
            splitBy="word"
            stagger={0.03}
          />

          {post.excerpt && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.9 }}
              className="mt-10 font-serif italic text-2xl lg:text-3xl leading-[1.35] text-[color:var(--color-ink-muted)] max-w-3xl"
            >
              {post.excerpt}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.9 }}
            className="mt-12 flex items-center gap-4 pt-8 border-t border-[color:var(--color-hairline)]"
          >
            <div className="w-10 h-10 rounded-full bg-[color:var(--color-ink)] text-[color:var(--color-paper)] flex items-center justify-center font-serif text-sm">
              EV
            </div>
            <div>
              <div className="text-[13px] text-[color:var(--color-ink)]">{post.author}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
                CEO e Fundador · NOMOS GT
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
// end of PostHero
