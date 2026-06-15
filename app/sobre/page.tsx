import type { Metadata } from "next";
import { SobreHero } from "@/components/sobre/sobre-hero";
import { Bio } from "@/components/sobre/bio";
import { Metodo } from "@/components/sobre/metodo";
import { Valores } from "@/components/sobre/valores";
import { Time } from "@/components/sobre/time";

export const metadata: Metadata = {
  title: "Sobre · NOMOS GT",
  description:
    "Éverton Vicente — fundador da NOMOS GT. Formação técnica rigorosa em Direito Tributário e mais de R$100 milhões em créditos recuperados.",
};

export default function SobrePage() {
  return (
    <>
      <SobreHero />
      <Bio />
      <Metodo />
      <Valores />
      <Time />
    </>
  );
}
