import type { Metadata } from "next";
import { ServicosHero } from "@/components/servicos/servicos-hero";
import { ServicosList } from "@/components/servicos/servicos-list";
import { ClassificacaoRisco } from "@/components/servicos/classificacao-risco";
import { FAQ } from "@/components/servicos/faq";
import { ServicosCTA } from "@/components/servicos/servicos-cta";

export const metadata: Metadata = {
  title: "Serviços · NOMOS GT",
  description:
    "Áreas de atuação: Consultoria Tributária, Recuperação de Créditos, Busca por Dívida Ativa e Regularização Fiscal.",
};

export default function ServicosPage() {
  return (
    <>
   
   <ServicosHero />
      <ServicosList />
      <ClassificacaoRisco />
      <FAQ />
      <ServicosCTA />
    </>
  );
}
