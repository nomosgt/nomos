import type { Metadata } from "next";
import { AtividadesAdmin } from "@/components/admin/atividades-admin";

export const metadata: Metadata = {
  title: "Atividades · Admin Arché",
};

export const dynamic = "force-dynamic";

/**
 * Atividades — centro de comando do gestor: cria e atribui tarefas às
 * advogadas, vincula a cliente e processo, define prazo/prioridade e
 * acompanha status e atrasos em tempo real.
 */
export default function AdminAtividadesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Atividades
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Distribua o trabalho da equipe, acompanhe prazos e veja os atrasos
          na hora. Atividades marcadas como visíveis aparecem no portal do
          cliente quando concluídas.
        </p>
      </div>
      <AtividadesAdmin />
    </div>
  );
}
