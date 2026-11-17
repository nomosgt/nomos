import type { Metadata } from "next";
import { Open_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ConditionalNavbar, ConditionalFooter } from "@/components/conditional-chrome";

// Open Sans — fonte única da identidade Arché (protótipo oficial:
// --serif/--sans/--mono apontam todos para Open Sans).
const openSans = Open_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-opensans",
  display: "swap",
});

// Inter — usada apenas no subtexto da logo (como no protótipo).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arché — Inteligência Empresarial",
  description:
    "Estratégia, inteligência e execução para gerar valor, fortalecer negócios e construir resultados sustentáveis. Núcleo Tributário e Núcleo Empresarial. +R$ 100 milhões em créditos recuperados pelo time Arché.",
  metadataBase: new URL("https://archebrasil.com.br"),
  openGraph: {
    title: "Arché — Até onde sua empresa pode crescer?",
    description:
      "+R$ 100 milhões em créditos recuperados pelo time Arché. Inteligência tributária e empresarial para transformar tributos em valor e crescimento.",
    type: "website",
    locale: "pt_BR",
    url: "https://archebrasil.com.br",
    siteName: "Arché",
    images: [
      {
        url: "/og/og-default.png",
        width: 1200,
        height: 630,
        alt: "Arché — Até onde sua empresa pode crescer?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arché — Inteligência Empresarial",
    description:
      "Até onde sua empresa pode crescer? +R$ 100 milhões em créditos recuperados.",
    images: ["/og/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${openSans.variable} ${inter.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased">
        <ConditionalNavbar />
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
