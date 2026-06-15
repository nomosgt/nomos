import type { Metadata } from "next";
import { CnpjHero } from "@/components/cnpj/cnpj-hero";
import { CnpjAnalyzer } from "@/components/cnpj/cnpj-analyzer";

export const metadata: Metadata = {
  title: "Análise CNPJ · NOMOS GT",
  description:
    "Cole o CNPJ da sua empresa e receba uma leitura tributária preliminar — perfil provável, teses aplicáveis e próxima ação concreta. Sem custo.",
};

export default function CnpjPage() {
  return (
    <>
      <CnpjHero />
      <CnpjAnalyzer />
    </>
  );
}
