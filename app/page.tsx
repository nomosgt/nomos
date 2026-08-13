import { Hero } from "@/components/home/hero";
import { CounterBand } from "@/components/home/counter-band";
import { Stat95 } from "@/components/home/stat-95";
import { AreasSection } from "@/components/home/areas-section";
import { WhyNomos } from "@/components/home/why-nomos";
import { FotoEmCampo } from "@/components/home/foto-em-campo";
import { SimuladorTeaser } from "@/components/home/simulador-teaser";
import { MapaBrasil } from "@/components/home/mapa-brasil";
import { Manifesto } from "@/components/home/manifesto";
import { ClosingCTA } from "@/components/home/closing-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CounterBand />
      <Stat95 />
      <AreasSection />
      <WhyNomos />
      <FotoEmCampo />
      <SimuladorTeaser />
      <MapaBrasil />
      <Manifesto />
      <ClosingCTA />
    </>
  );
}
