"use client";

import { motion } from "framer-motion";

interface Props {
  prazoMeses: number;
}

/**
 * Timeline horizontal mostrando janela retroativa de 5 anos + prazo até primeira recuperação.
 */
export function TimelineRetroativa({ prazoMeses }: Props) {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 5;

  return (
    <div className="bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-6 lg:p-10 grain">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand-soft)] mb-2">
        Linha do tempo
      </div>
      <h4 className="font-serif text-xl lg:text-2xl text-[color:var(--color-paper)] mb-1">
        Janela de recuperação
      </h4>
      <p className="text-[12px] text-[color:var(--color-paper)]/55 mb-8">
        5 anos retroativos por lei, mais o prazo estimado até a primeira monetização
      </p>

      {/* Timeline visual */}
      <div className="relative pt-12 pb-16">
        {/* Linha principal */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-[color:var(--color-paper)]/20" />
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "left center" }}
          className="absolute left-0 top-1/2 h-px w-[60%] bg-[color:var(--color-brand-soft)]"
        />

        {/* Marcadores */}
        <div className="relative grid grid-cols-6 gap-2 items-center">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="font-mono text-[10px] text-[color:var(--color-paper)]/50 mb-3">
                {startYear + i}
              </div>
              <div
                className={`w-2 h-2 rounded-full ${
                  i < 5
                    ? "bg-[color:var(--color-brand-soft)]"
                    : "bg-[color:var(--color-paper)] border-2 border-[color:var(--color-brand-soft)]"
                }`}
              />
              {i === 0 && (
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-brand-soft)] mt-3 text-center">
                  Início
                </div>
              )}
              {i === 5 && (
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-paper)] mt-3 text-center">
                  Hoje
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Indicador de prazo até recuperação */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1.4 }}
        className="grid grid-cols-2 gap-6 pt-6 border-t border-[color:var(--color-paper)]/15"
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/50 mb-2">
            Período retroativo
          </div>
          <div className="font-mono text-2xl lg:text-3xl tracking-tight text-[color:var(--color-paper)]">
            60 meses
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/50 mb-2">
            Prazo estimado · 1ª recuperação
          </div>
          <div className="font-mono text-2xl lg:text-3xl tracking-tight text-[color:var(--color-brand-soft)]">
            ~{prazoMeses} meses
          </div>
        </div>
      </motion.div>
    </div>
  );
}
