"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";

/**
 * template.tsx re-monta a cada navegação no Next 15.
 *
 * Sequência cinematográfica de transição entre rotas:
 *  1) Sliver azul brand atravessa o topo do viewport (left → right wipe)
 *  2) Símbolo NGT aparece centralizado por 220ms (heartbeat curto)
 *  3) Conteúdo da nova rota entra com fade + slight slide up
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Sliver azul brand atravessando o topo */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={{
          scaleX: [0, 1, 1, 0],
          transformOrigin: ["left", "left", "right", "right"],
        }}
        transition={{
          duration: 1.1,
          times: [0, 0.45, 0.55, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-[color:var(--color-brand)] z-[100] pointer-events-none"
      />

      {/* Símbolo NGT pulsando — apenas no fim da transição, super discreto */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: [0, 0.85, 0], scale: [0.85, 1, 1.05] }}
        transition={{
          duration: 0.9,
          times: [0, 0.5, 1],
          ease: [0.22, 1, 0.36, 1],
          delay: 0.05,
        }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99] pointer-events-none mix-blend-difference"
      >
        <Logo
          variant="symbol"
          className="h-12 w-auto text-[color:var(--color-paper)]"
        />
      </motion.div>

      {/* Conteúdo entra com fade + slight slide */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.2,
        }}
      >
        {children}
      </motion.div>
    </>
  );
}
// end of Template
