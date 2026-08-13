import type { Metadata } from "next";
import { ServicosHero } from "@/components/servicos/servicos-hero";
import { ServicosList } from "@/components/servicos/servicos-list";
import { ClassificacaoRisco } from "@/components/servicos/classificacao-risco";
import { NucleoEmpresarial } from "@/components/servicos/nucleo-empresarial";
import { FAQ } from "@/components/servicos/faq";
import { ServicosCTA } from "@/components/servicos/servicos-cta";

export const metadata: Metadata = {
  title: "Serviços · Arché",
  description:
    "Dois núcleos, uma direção: Núcleo Tributário (consultoria e recuperação de créditos) e Núcleo Empresarial (governança e gestão).",
};

export default function ServicosPage() {
  return (
    <>
      <ServicosHero />
      <ServicosList />
      <ClassificacaoRisco />
      <NucleoEmpresarial />
      <FAQ />
      <ServicosCTA />
    </>
  );
}
