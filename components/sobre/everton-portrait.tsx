"use client";

import Image from "next/image";

/**
 * Retrato editorial do Éverton — foto natural com tratamento técnico:
 * - Sem filtros de cor (foto crua)
 * - Frame "documento técnico" com metadata
 * - Grain de filme sutil
 * - Letterboxing leve com gradient
 */
export function EvertonPortrait() {
  return (
    <div className="relative">
      <div className="relative aspect-[3/4] bg-[color:var(--color-ink)] overflow-hidden">
        <Image
          src="/everton/everton-palco.jpg"
          alt="Éverton Vicente, CEO e Fundador da NOMOS GT"
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 40vw"
        />

        {/* Grain de filme sutil */}
        <div
          aria-hidden
          className="absolute inset-0 z-[3] pointer-events-none opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")",
          }}
        />

        {/* Letterboxing leve nos cantos */}
        <div
          aria-hidden
          className="absolute inset-0 z-[3] pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(14,21,37,0.35) 0%, transparent 22%, transparent 78%, rgba(14,21,37,0.55) 100%)",
          }}
        />

        {/* Frame técnico — cantos */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-[color:var(--color-paper)]/80 z-[4]" />
        <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-[color:var(--color-paper)]/80 z-[4]" />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-[color:var(--color-paper)]/80 z-[4]" />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-[color:var(--color-paper)]/80 z-[4]" />

        {/* Metadata superior */}
        <div className="absolute top-6 left-6 z-[5] font-mono text-[9px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/90 leading-relaxed">
          <div>REG · EV-001/2025</div>
          <div className="opacity-70">São Paulo · BR</div>
        </div>

        {/* Metadata inferior */}
        <div className="absolute bottom-6 right-6 z-[5] text-right font-mono text-[9px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/90 leading-relaxed">
          <div>NGT · CEO</div>
          <div className="opacity-70">Éverton Vicente</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)]">
        <span>◇ Retrato</span>
        <span>NGT · 2025</span>
      </div>
    </div>
  );
}
// end of EvertonPortrait
