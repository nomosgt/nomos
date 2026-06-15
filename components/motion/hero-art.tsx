"use client";

import { motion } from "framer-motion";

/**
 * Arte SVG abstrata do Hero — linhas finas que se desenham (stroke-dashoffset),
 * números fiscais flutuando em opacity baixa, malha geométrica tipo "documento técnico".
 *
 * Posicionada absolute, pointer-events-none.
 */
export function HeroArt() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Linhas geométricas grandes que se desenham — lado direito */}
      <svg
        className="absolute -right-32 top-10 lg:right-0 lg:top-0 w-[720px] h-[720px] opacity-[0.07]"
        viewBox="0 0 720 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* Linhas radiais saindo de um ponto central */}
        {[0, 18, 36, 54, 72, 90, 108, 126, 144, 162].map((deg, i) => (
          <motion.line
            key={deg}
            x1="360"
            y1="360"
            x2={360 + Math.cos((deg * Math.PI) / 180) * 360}
            y2={360 + Math.sin((deg * Math.PI) / 180) * 360}
            stroke="var(--color-ink)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{
              duration: 2.2,
              delay: 0.6 + i * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
        {/* Círculos concêntricos */}
        {[120, 200, 280, 360].map((r, i) => (
          <motion.circle
            key={r}
            cx="360"
            cy="360"
            r={r}
            stroke="var(--color-brand)"
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{
              duration: 2.4,
              delay: 0.9 + i * 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </svg>

      {/* Grid hairline sutil (canto inferior esquerdo) */}
      <svg
        className="absolute -left-20 bottom-10 w-[380px] h-[380px] opacity-[0.06]"
        viewBox="0 0 380 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <pattern
            id="hero-grid"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-ink)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <motion.rect
          width="380"
          height="380"
          fill="url(#hero-grid)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 1.2 }}
        />
      </svg>

      {/* Números fiscais flutuando — tags discretas */}
      <div className="absolute inset-0">
        {[
          { text: "Tema 69", top: "18%", right: "8%", delay: 1.8 },
          { text: "ICMS", top: "32%", right: "18%", delay: 2.0 },
          { text: "PIS/COFINS", top: "62%", right: "6%", delay: 2.2 },
          { text: "STF", top: "78%", right: "22%", delay: 2.4 },
        ].map((t) => (
          <motion.div
            key={t.text}
            className="absolute font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] opacity-0"
            style={{ top: t.top, right: t.right }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.45, y: 0 }}
            transition={{ duration: 1.2, delay: t.delay, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-[color:var(--color-brand)] mr-2">◇</span>
            {t.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
