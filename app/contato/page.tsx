import type { Metadata } from "next";
import { ContatoHero } from "@/components/contato/contato-hero";
import { ContatoForm } from "@/components/contato/contato-form";

export const metadata: Metadata = {
  title: "Contato · Arché",
  description:
    "Agende uma conversa inicial com a Arché. Email, WhatsApp e formulário direto com o sócio fundador.",
};

export default function ContatoPage() {
  return (
    <>
      <ContatoHero />
      <ContatoForm />
    </>
  );
}
