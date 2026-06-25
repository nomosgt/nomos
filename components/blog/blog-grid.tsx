"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/section";
import { CATEGORIAS, type Categoria, type BlogPost } from "@/lib/validation/blog";

const formatDate = (date: string | null | undefined) =>
  date
    ? new Date(date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

export function BlogGrid({ posts }: { posts: BlogPost[] }) {
  const [filter, setFilter] = useState<Categoria | null>(null);
  const filtered = filter
    ? posts.filter((p) => p.categoria === filter)
    : posts;
  const [featured, ...rest] = filtered;

  return (
    <section className="border-t border-[color:var(--color-hairline)] pb-32">
      <Container>
        <div className="pt-10 mb-12 flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setFilter(null)}
            className={`px-4 py-2 border text-[12px] transition-all duration-200 ${
              filter === null
                ? "border-[color:var(--color-ink)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                : "border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
            }`}
          >
            Todas
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-4 py-2 border text-[12px] transition-all duration-200 ${
                filter === c
                  ? "border-[color:var(--color-ink)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                  : "border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-20"
          >
            <Link
              href={`/blog/${featured.slug}`}
              className="group block border border-[color:var(--color-hairline)] hover:bg-[color:var(--color-surface)] transition-colors duration-500"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="relative aspect-[4/3] lg:aspect-auto bg-[color:var(--color-ink)] overflow-hidden">
                  {featured.cover_url ? (
                    <img
                      src={featured.cover_url}
                      alt={featured.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <PostCover number={featured.cover} large />
                  )}
                </div>
                <div className="p-8 lg:p-12 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)]">
                      <span className="text-[color:var(--color-brand)]">✦ Em destaque</span>
                      <span>·</span>
                      <span>{featured.categoria}</span>
                    </div>
                    <h2 className="font-serif text-3xl lg:text-5xl leading-[1.05] tracking-tight text-[color:var(--color-ink)] mb-6 group-hover:text-[color:var(--color-brand-dim)] transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-[15px] lg:text-[16px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-xl">
                      {featured.excerpt}
                    </p>
                  </div>
                  <div className="mt-10 flex items-center justify-between pt-6 border-t border-[color:var(--color-hairline)]">
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
                      {formatDate(featured.published_at)} · {featured.read_time} min · {featured.author}
                    </div>
                    <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
          {rest.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.6 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group block bg-[color:var(--color-background)] p-7 lg:p-8 h-full hover:bg-[color:var(--color-surface)] transition-colors duration-500"
              >
                <div className="relative aspect-[5/3] bg-[color:var(--color-ink)] overflow-hidden mb-7">
                  {post.cover_url ? (
                    <img
                      src={post.cover_url}
                      alt={post.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <PostCover number={post.cover} />
                  )}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mb-4">
                  {post.categoria}
                </div>
                <h3 className="font-serif text-2xl lg:text-[26px] leading-[1.1] tracking-tight text-[color:var(--color-ink)] mb-4 group-hover:text-[color:var(--color-brand-dim)] transition-colors">
                  {post.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-[color:var(--color-ink-muted)] mb-6 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] pt-4 border-t border-[color:var(--color-hairline)]">
                  {formatDate(post.published_at)} · {post.read_time} min
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function PostCover({ number, large = false }: { number: string; large?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(250,250,247,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(250,250,247,0.15) 1px, transparent 1px)",
          backgroundSize: large ? "60px 60px" : "30px 30px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 60% at 70% 30%, rgba(140,111,63,0.25) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex items-end justify-between w-full h-full p-6 lg:p-10">
        <div className="font-serif text-[color:var(--color-paper)]/40 text-[clamp(5rem,12vw,12rem)] leading-none">
          {number}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/40 self-start">
          NOMOS · Editorial
        </div>
      </div>
    </div>
  );
}
// end of BlogGrid
