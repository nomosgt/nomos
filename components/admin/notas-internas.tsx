"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Save } from "lucide-react";

export function NotasInternas({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved("saving");
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("contact_submissions")
        .update({ notas_internas: value })
        .eq("id", id);
      if (error) {
        console.error(error);
        setSaved("idle");
        return;
      }
      setSaved("saved");
      setTimeout(() => setSaved("idle"), 2000);
    });
  }

  const dirty = value !== initial;

  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
          Notas internas
        </div>
        {dirty && saved !== "saved" && (
          <button
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] bg-[color:var(--color-ink)] text-[color:var(--color-paper)] hover:-translate-y-0.5 transition-transform disabled:opacity-60"
          >
            <Save className="w-3 h-3" />
            {saved === "saving" ? "Salvando…" : "Salvar"}
          </button>
        )}
        {saved === "saved" && (
          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-mono uppercase tracking-[0.15em]">
            <Check className="w-3 h-3" /> Salvo
          </div>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        placeholder="Notas internas sobre o lead — só visíveis para admins."
        className="w-full bg-transparent text-[14px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none resize-y"
      />
    </div>
  );
}
