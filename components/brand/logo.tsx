import { cn } from "@/lib/utils";

/**
 * Logo ARCHÉ — Inteligência Empresarial.
 *
 *   Geometria:
 *   - Símbolo: 3 barras diagonais (paralelogramos ///) — 1ª navy (currentColor),
 *     2ª e 3ª cinza aço (#A6A8AB), como no identity oficial Arché.
 *   - Full: símbolo + wordmark "ARCHÉ" (serif) + tagline "INTELIGÊNCIA EMPRESARIAL".
 *
 *   Inline SVG com currentColor — em fundo claro use text-ink/text-brand,
 *   em fundo escuro use text-white (vira a versão branca da marca).
 */

interface LogoProps {
  className?: string;
  variant?: "symbol" | "full";
}

const STEEL = "#A6A8AB";
const TAG = "#8B8E94";

function Stripes({ opacity = 1 }: { opacity?: number }) {
  return (
    <g opacity={opacity}>
      <polygon points="0,100 17,100 45,0 28,0" fill="currentColor" />
      <polygon points="25,100 42,100 70,0 53,0" fill={STEEL} />
      <polygon points="50,100 67,100 95,0 78,0" fill={STEEL} />
    </g>
  );
}

export function Logo({ className, variant = "symbol" }: LogoProps) {
  if (variant === "symbol") {
    return (
      <svg
        viewBox="0 0 95 100"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Arché"
        className={cn("inline-block shrink-0", className)}
      >
        <title>Arché — Inteligência Empresarial</title>
        <Stripes />
      </svg>
    );
  }

  // variant="full" — símbolo + ARCHÉ + tagline
  return (
    <svg
      viewBox="0 0 372 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Arché — Inteligência Empresarial"
      className={cn("inline-block shrink-0", className)}
    >
      <title>Arché — Inteligência Empresarial</title>
      <g transform="translate(0 10) scale(0.8)">
        <Stripes />
      </g>
      <text
        x="94"
        y="60"
        fill="currentColor"
        fontFamily="var(--font-fraunces), Georgia, 'Times New Roman', serif"
        fontSize="47"
        fontWeight={560}
        letterSpacing="3"
        style={{ fontOpticalSizing: "auto" }}
      >
        ARCHÉ
      </text>
      <text
        x="96"
        y="83"
        fill={TAG}
        fontFamily="var(--font-geist), ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        fontWeight={500}
        letterSpacing="3.6"
      >
        INTELIGÊNCIA EMPRESARIAL
      </text>
    </svg>
  );
}
