"use client";

import { Container } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import type { BlogPost } from "@/lib/validation/blog";

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "img"; src: string; alt: string };

function parseMarkdown(body: string): Block[] {
  const blocks: Block[] = [];
  const chunks = body.split(/\n\s*\n/);
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push({ type: "ul", items: listBuffer.slice() });
      listBuffer = [];
    }
  };

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    // Imagem isolada: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushList();
      blocks.push({ type: "img", alt: imgMatch[1], src: imgMatch[2] });
      continue;
    }

    // Lista (linhas começando com - ou *)
    const lines = trimmed.split("\n");
    const allListItems = lines.every((l) => /^[-*]\s+/.test(l.trim()));
    if (allListItems && lines.length > 0) {
      lines.forEach((l) => {
        listBuffer.push(l.trim().replace(/^[-*]\s+/, ""));
      });
      continue;
    }

    flushList();

    // Headings
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h2", text: trimmed.slice(2) });
      continue;
    }

    // Parágrafo
    blocks.push({ type: "p", text: trimmed });
  }
  flushList();
  return blocks;
}

/** Renderiza inline markdown: **bold**, *italic*, [link](url) */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    if (match[1]) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(<em key={key++}>{match[4]}</em>);
    } else if (match[5]) {
      nodes.push(
        <a
          key={key++}
          href={match[7]}
          target={match[7].startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="text-[color:var(--color-brand)] underline underline-offset-2 hover:no-underline"
        >
          {match[6]}
        </a>,
      );
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function PostBody({ post }: { post: BlogPost; related?: BlogPost[] }) {
  const blocks = parseMarkdown(post.body);

  return (
    <section className="py-16 lg:py-24 border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 lg:gap-24">
          <article className="space-y-8">
            {blocks.map((b, i) => {
              if (b.type === "h2") {
                return (
                  <Reveal key={i} delay={i * 0.04}>
                    <h2 className="font-serif text-3xl lg:text-4xl tracking-tight text-[color:var(--color-ink)] mt-8">
                      {renderInline(b.text)}
                    </h2>
                  </Reveal>
                );
              }
              if (b.type === "h3") {
                return (
                  <Reveal key={i} delay={i * 0.04}>
                    <h3 className="font-serif text-2xl tracking-tight text-[color:var(--color-ink)] mt-6">
                      {renderInline(b.text)}
                    </h3>
                  </Reveal>
                );
              }
              if (b.type === "img") {
                return (
                  <Reveal key={i} delay={i * 0.04}>
                    <figure className="my-4">
                      <img
                        src={b.src}
                        alt={b.alt}
                        loading="lazy"
                        className="w-full h-auto"
                      />
                      {b.alt && (
                        <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] text-center">
                          {b.alt}
                        </figcaption>
                      )}
                    </figure>
                  </Reveal>
                );
              }
              if (b.type === "ul") {
                return (
                  <Reveal key={i} delay={i * 0.04}>
                    <ul className="space-y-2 list-disc pl-6 text-[17px] leading-[1.7] text-[color:var(--color-ink)]">
                      {b.items.map((it, j) => (
                        <li key={j}>{renderInline(it)}</li>
                      ))}
                    </ul>
                  </Reveal>
                );
              }
              // parágrafo
              return (
                <Reveal key={i} delay={i * 0.04}>
                  <p
                    className={`leading-[1.7] text-[color:var(--color-ink)] whitespace-pre-wrap ${
                      i === 0
                        ? "font-serif text-2xl lg:text-3xl leading-[1.35]"
                        : "text-[17px]"
                    }`}
                  >
                    {renderInline(b.text)}
                  </p>
                </Reveal>
              );
            })}
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
