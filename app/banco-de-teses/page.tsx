import type { Metadata } from "next";
import { TesesHero } from "@/components/teses/teses-hero";
import { TesesBrowser } from "@/components/teses/teses-browser";
import { TesesCTA } from "@/components/teses/teses-cta";

export const metadata: Metadata = {
  title: "Banco de Teses · NOMOS GT",
  description:
    "Biblioteca técnica de teses tributárias mapeadas e analisadas pela NOMOS GT.",
};

export default function TesesPage() {
  return (
    <>
      <TesesHero />
      <TesesBrowser />
      <TesesCTA />
    </>
  );
}
