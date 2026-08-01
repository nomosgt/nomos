"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/55 backdrop-blur-sm px-4 py-[6vh] overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`bg-[color:var(--color-background)] w-full ${wide ? "max-w-2xl" : "max-w-md"} shadow-2xl`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-hairline)]">
              <h3 className="font-serif text-lg text-[color:var(--color-ink)]">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink)] transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({
  label,
  children,
  span2,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "md:col-span-2" : ""}>
      <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full bg-transparent border border-[color:var(--color-hairline)] px-3 py-2.5 text-[14px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none focus:border-[color:var(--color-brand)] transition-colors";

export const selectCls = inputCls + " appearance-none bg-[color:var(--color-background)]";

const BADGE_STYLES: Record<string, string> = {
  em_andamento: "text-emerald-700 bg-emerald-50 border-emerald-200",
  aguardando: "text-amber-700 bg-amber-50 border-amber-200",
  concluido: "text-[color:var(--color-brand)] bg-blue-50 border-blue-200",
  arquivado: "text-gray-500 bg-gray-50 border-gray-200",
  pendente: "text-amber-700 bg-amber-50 border-amber-200",
  aprovado: "text-emerald-700 bg-emerald-50 border-emerald-200",
  ressalva: "text-orange-700 bg-orange-50 border-orange-200",
  reprovado: "text-rose-700 bg-rose-50 border-rose-200",
  prevista: "text-gray-600 bg-gray-50 border-gray-200",
  aprovada: "text-amber-700 bg-amber-50 border-amber-200",
  paga: "text-emerald-700 bg-emerald-50 border-emerald-200",
  alta: "text-rose-700 bg-rose-50 border-rose-200",
  media: "text-amber-700 bg-amber-50 border-amber-200",
  baixa: "text-gray-600 bg-gray-50 border-gray-200",
};

const BADGE_LABELS: Record<string, string> = {
  em_andamento: "Em andamento",
  aguardando: "Aguardando",
  concluido: "Concluído",
  arquivado: "Arquivado",
  pendente: "Pendente",
  aprovado: "Aprovado",
  ressalva: "Com ressalva",
  reprovado: "Reprovado",
  prevista: "Prevista",
  aprovada: "Aprovada",
  paga: "Paga",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border whitespace-nowrap ${
        BADGE_STYLES[status] || "text-gray-600 bg-gray-50 border-gray-200"
      }`}
    >
      {BADGE_LABELS[status] || status}
    </span>
  );
}

export function UrgencyDot({ level }: { level: string | null }) {
  if (!level) return null;
  const color =
    level === "vencido" ? "bg-rose-600" :
    level === "critico" ? "bg-rose-500" :
    level === "proximo" ? "bg-amber-500" :
    "bg-emerald-500";
  const label =
    level === "vencido" ? "Vencido" :
    level === "critico" ? "≤ 3 dias" :
    level === "proximo" ? "≤ 10 dias" :
    "No prazo";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-ink-muted)]">
      <span className={`w-2 h-2 rounded-full ${color} ${level === "critico" || level === "vencido" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-[color:var(--color-hairline)] p-12 text-center">
      <div className="font-serif text-lg text-[color:var(--color-ink)] mb-1">{title}</div>
      <p className="text-[13px] text-[color:var(--color-ink-muted)] mb-6">{body}</p>
      {action}
    </div>
  );
}

export const btnPrimary =
  "inline-flex items-center gap-2 px-4 py-2.5 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50";
export const btnBrand =
  "inline-flex items-center gap-2 px-4 py-2.5 bg-[color:var(--color-brand)] text-white text-[12px] font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center gap-2 px-3 py-2 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)] text-[12px] transition-colors hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]";
export const btnDanger =
  "inline-flex items-center gap-2 px-3 py-2 border border-rose-300 text-rose-700 text-[12px] transition-colors hover:bg-rose-50";
