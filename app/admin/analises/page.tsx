import type { Metadata } from "next";
import { AnalisesAdmin } from "@/components/admin/analises-admin";

export const metadata: Metadata = {
  title: "Análises da Equipe · Admin Arché",
};

export default function AnalisesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl lg:text-3xl text-[color:var(--color-ink)]">
          Análises da Equipe
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--color-ink-muted)]">
          Análises técnicas produzidas pelos colaboradores — revise, comente, solicite ajustes e aprove.
        </p>
      </div>
      <AnalisesAdmin />
    </div>
  );
}
