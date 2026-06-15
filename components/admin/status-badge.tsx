export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    novo: { label: "Novo", color: "bg-blue-100 text-blue-800" },
    em_atendimento: {
      label: "Em atendimento",
      color: "bg-amber-100 text-amber-800",
    },
    qualificado: {
      label: "Qualificado",
      color: "bg-emerald-100 text-emerald-800",
    },
    fechado: { label: "Fechado", color: "bg-gray-200 text-gray-700" },
    descartado: { label: "Descartado", color: "bg-red-100 text-red-700" },
  };
  const v = map[status] || {
    label: status,
    color: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${v.color}`}
    >
      {v.label}
    </span>
  );
}
