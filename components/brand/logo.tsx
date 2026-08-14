/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * Logo ARCHÉ — arquivos oficiais da marca (identity fornecido pelo Éverton).
 *
 *   /public/brand/arche-full-blue.png    — símbolo + ARCHÉ + tagline (fundo claro)
 *   /public/brand/arche-full-white.png   — versão branca (fundo escuro)
 *   /public/brand/arche-symbol-blue.png  — só as 3 barras diagonais
 *   /public/brand/arche-symbol-white.png — só as barras, branca
 *
 *   tone é inferido automaticamente quando o className herdado usa cor clara
 *   (text-[--color-paper] / text-white) — mas pode ser forçado via prop.
 */

interface LogoProps {
  className?: string;
  variant?: "symbol" | "full";
  tone?: "blue" | "white";
}

function inferTone(className?: string): "blue" | "white" {
  if (!className) return "blue";
  if (
    className.includes("--color-paper") ||
    className.includes("text-white") ||
    className.includes("paper)]")
  ) {
    return "white";
  }
  return "blue";
}

export function Logo({ className, variant = "symbol", tone }: LogoProps) {
  const t = tone ?? inferTone(className);
  const src =
    variant === "symbol"
      ? `/brand/arche-symbol-${t}.png`
      : `/brand/arche-full-${t}.png`;
  const alt = "Arché — Inteligência Empresarial";

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn("inline-block shrink-0 w-auto select-none", className)}
    />
  );
}
