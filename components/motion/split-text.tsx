"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import type { RefObject } from "react";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  stagger?: number;
  splitBy?: "char" | "word";
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
}

/**
 * Reveal palavra-a-palavra via opacity + leve translate Y.
 * Sem overflow-hidden — evita cortar ascenders/descenders de fontes serif italic.
 */
export function SplitText({
  text,
  className,
  delay = 0,
  duration = 0.9,
  stagger = 0.04,
  splitBy = "word",
  as = "h1",
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });

  const parts =
    splitBy === "word" ? text.split(/(\s+)/) : text.split("");

  const children = parts.map((part, i) => {
    if (/^\s+$/.test(part)) {
      return <span key={i}>{part}</span>;
    }
    return (
      <motion.span
        key={i}
        className="inline-block will-change-transform"
        initial={{ y: 18, opacity: 0 }}
        animate={inView ? { y: 0, opacity: 1 } : {}}
        transition={{
          duration,
          delay: delay + i * stagger,
          ease: [0.22, 1, 0.36, 1],
        }}
        aria-hidden="true"
      >
        {part}
      </motion.span>
    );
  });

  // JSX explícito por tag (React Compiler precisa de refs tipados)
  switch (as) {
    case "h1":
      return <h1 ref={ref as RefObject<HTMLHeadingElement>} className={className} aria-label={text}>{children}</h1>;
    case "h2":
      return <h2 ref={ref as RefObject<HTMLHeadingElement>} className={className} aria-label={text}>{children}</h2>;
    case "h3":
      return <h3 ref={ref as RefObject<HTMLHeadingElement>} className={className} aria-label={text}>{children}</h3>;
    case "p":
      return <p ref={ref as RefObject<HTMLParagraphElement>} className={className} aria-label={text}>{children}</p>;
    case "span":
      return <span ref={ref as RefObject<HTMLSpanElement>} className={className} aria-label={text}>{children}</span>;
    case "div":
    default:
      return <div ref={ref as RefObject<HTMLDivElement>} className={className} aria-label={text}>{children}</div>;
  }
}
// end of SplitText
