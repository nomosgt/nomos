"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface CTAProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "inverted";
  size?: "sm" | "md" | "lg";
  className?: string;
  arrow?: boolean;
  external?: boolean;
}

/**
 * CTA com animação de fill from-left + arrow slide.
 * Variantes: primary (fundo navy), secondary (outline), ghost (texto), inverted (fundo paper sobre dark).
 */
export function CTA({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  arrow = true,
  external,
}: CTAProps) {
  const base =
    "group relative inline-flex items-center justify-center gap-2 font-medium overflow-hidden isolate transition-transform duration-300 hover:-translate-y-0.5";

  const variants = {
    primary:
      "bg-[color:var(--color-ink)] text-[color:var(--color-paper)] hover:shadow-[0_12px_32px_-12px_rgba(14,21,37,0.45)] before:absolute before:inset-0 before:bg-[color:var(--color-brand)] before:translate-x-[-101%] before:transition-transform before:duration-500 before:ease-[cubic-bezier(.22,1,.36,1)] before:-z-10 hover:before:translate-x-0",
    secondary:
      "border border-[color:var(--color-ink)] text-[color:var(--color-ink)] hover:text-[color:var(--color-paper)] before:absolute before:inset-0 before:bg-[color:var(--color-ink)] before:translate-x-[-101%] before:transition-transform before:duration-500 before:ease-[cubic-bezier(.22,1,.36,1)] before:-z-10 hover:before:translate-x-0",
    ghost:
      "text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)]",
    inverted:
      "bg-[color:var(--color-paper)] text-[color:var(--color-ink)] before:absolute before:inset-0 before:bg-[color:var(--color-brand-soft)] before:translate-x-[-101%] before:transition-transform before:duration-500 before:ease-[cubic-bezier(.22,1,.36,1)] before:-z-10 hover:before:translate-x-0",
  };

  const sizes = {
    sm: "px-4 py-2 text-[12px]",
    md: "px-6 py-3.5 text-[13px]",
    lg: "px-8 py-5 text-[14px]",
  };

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        {arrow && (
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
        )}
      </span>
    </Link>
  );
}
// end of CTA
