import type { Metadata } from "next";
import { ParceirosCentral } from "@/components/admin/parceiros-central";

export const metadata: Metadata = {
  title: "Parceiros · Admin Arché",
};

export const dynamic = "force-dynamic";

export default function AdminParceirosPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Central do Parceiro
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Dados sincronizados de cada colaborador — aprove demandas, controle
          comissões e publique avanços na Sala do Cliente.
        </p>
      </div>
      <ParceirosCentral />
    </div>
  );
}
