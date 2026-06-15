"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, Check } from "lucide-react";

const OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "qualificado", label: "Qualificado" },
  { value: "fechado", label: "Fechado" },
  { value: "descartado", label: "Descartado" },
];

export function StatusUpdater({ id, current }: { id: string; current: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(current);
  const [pending, startTransition] = useTransition();

  function update(newStatus: string) {
    setOpen(false);
    if (newStatus === status) return;
    setStatus(newStatus);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("contact_submissions")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) {
        console.error(error);
        setStatus(current); // rollback
      }
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-mono uppercase tracking-[0.2em] bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] hover:border-[color:var(--color-ink)] disabled:opacity-60"
      >
        Mudar status
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] shadow-lg z-10">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => update(o.value)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[13px] hover:bg-[color:var(--color-surface)]"
            >
              <span>{o.label}</span>
              {status === o.value && (
                <Check className="w-3.5 h-3.5 text-[color:var(--color-brand)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
