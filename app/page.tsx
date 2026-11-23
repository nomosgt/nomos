import { Hero } from "@/components/home/hero";
import { CounterBand } from "@/components/home/counter-band";
import { AreasSection } from "@/components/home/areas-section";
import { SimuladorTeaser } from "@/components/home/simulador-teaser";
import { ClosingCTA } from "@/components/home/closing-cta";

/**
 * Home minimalista — 5 blocos, respiro e sobriedade:
 * promessa (Hero) → prova (números reais) → o que fazemos (Áreas)
 * → convite (Simulador) → fechamento (CTA).
 * Seções anteriores (Stat95, Método, WhyNomos, Foto, Mapa, Manifesto)
 * permanecem em components/home/ caso a direção queira reativar.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <CounterBand />
      <AreasSection />
      <SimuladorTeaser />
      <ClosingCTA />
    </>
  );
}
