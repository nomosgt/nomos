import type { Metadata } from "next";
import { ArquivosColaboradores } from "@/components/admin/arquivos-colaboradores";

export const metadata: Metadata = {
  title: "Arquivos · Admin Arché",
};

export const dynamic = "force-dynamic";

/**
 * Arquivos dos colaboradores — visão total do admin sobre tudo o que
 * cada colaborador enviou (drive da Central + anexos de projetos).
 */
export default function AdminArquivosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Arquivos dos colaboradores
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Tudo o que cada colaborador enviou pela Central — em tempo real,
          direto do armazenamento. Clique para abrir no navegador ou baixar.
        </p>
      </div>
      <ArquivosColaboradores />
    </div>
  );
}
