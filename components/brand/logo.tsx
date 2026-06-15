import { cn } from "@/lib/utils";

/**
 * Logo NGT — geometria oficial do identity-package aprovado pelo Claude Design.
 *
 *   Geometria (viewBox 216 × 210):
 *   - 3 quadrados navy 100×100 em L invertido
 *   - 2 barras verticais 4×100 (gap 6 entre quadrados e barras)
 *   - wordmark "NGT" em Bodoni Moda 500, centrado oticamente na célula superior-direita
 *
 *   Inline SVG com currentColor — permite hover azul brand e variações de cor.
 *   Para versões fixas/exportadas, usar arquivos em /public/logo/.
 */

interface LogoProps {
  className?: string;
  variant?: "symbol" | "full";
}

export function Logo({ className, variant = "symbol" }: LogoProps) {
  if (variant === "symbol") {
    // Símbolo apenas — sem wordmark (3 quadrados + 2 barras)
    return (
      <svg
        viewBox="0 0 216 210"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="NGT"
        className={cn("inline-block shrink-0", className)}
      >
        <title>NGT — NOMOS Gestão Tributária</title>
        <rect x="0" y="0" width="100" height="100" />
        <rect x="106" y="0" width="4" height="100" />
        <rect x="0" y="110" width="100" height="100" />
        <rect x="106" y="110" width="4" height="100" />
        <rect x="116" y="110" width="100" height="100" />
      </svg>
    );
  }

  // variant="full" — símbolo + wordmark "NGT" Bodoni Moda
  return (
    <svg
      viewBox="0 0 216 210"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="NGT — NOMOS Gestão Tributária"
      className={cn("inline-block shrink-0", className)}
    >
      <title>NGT — NOMOS Gestão Tributária</title>
      <rect x="0" y="0" width="100" height="100" />
      <rect x="106" y="0" width="4" height="100" />
      <text
        x="166"
        y="66"
        textAnchor="middle"
        fontFamily="var(--font-bodoni), 'Bodoni Moda', 'Bodoni 72', Didot, 'Times New Roman', serif"
        fontSize="48"
        fontWeight={500}
        letterSpacing="1"
        style={{ fontFeatureSettings: "'liga', 'kern'" }}
      >
        NGT
      </text>
      <rect x="0" y="110" width="100" height="100" />
      <rect x="106" y="110" width="4" height="100" />
      <rect x="116" y="110" width="100" height="100" />
    </svg>
  );
}
