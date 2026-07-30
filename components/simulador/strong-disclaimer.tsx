"use client";

import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

/**
 * Disclaimer institucional forte, obrigatorio antes de qualquer valor.
 */
export function StrongDisclaimer() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="border-l-2 border-[color:var(--color-brand)] bg-[color:var(--color-surface)] p-5 lg:p-6 flex gap-4"
    >
      <ShieldAlert className="w-5 h-5 text-[color:var(--color-brand)] flex-shrink-0 mt-0.5" />
      <div className="text-[12px] leading-relaxed text-[color:var(--color-ink-muted)]">
        <strong className="text-[color:var(--color-ink)]">
          Esta análise não constitui parecer jurídico ou promessa de recuperação.
        </strong>{" "}
        Trata-se de estimativa estatística preliminar baseada em CNAE, localização,
        faturamento informado e benchmarks internos da nossa base de clientes do
        mesmo segmento. A viabilidade real depende de auditoria fiscal e documental
        completa (SPED, EFD, XMLs, balancetes, DCTF).
      </div>
    </motion.div>
  );
}
