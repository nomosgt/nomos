import type { Metadata } from "next";
import { SimuladorHero } from "@/components/simulador/simulador-hero";
import { SimuladorWizard } from "@/components/simulador/simulador-wizard";

export const metadata: Metadata = {
  title: "Simulador · NOMOS GT",
  description:
    "Calcule em 30 segundos o potencial estimado de recuperação tributária da sua empresa.",
};

export default function SimuladorPage() {
  return (
    <>
      <SimuladorHero />
      <SimuladorWizard />
    </>
  );
}
