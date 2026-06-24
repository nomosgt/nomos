import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono, Bodoni_Moda } from "next/font/google";
import "./globals.css";
import { ConditionalNavbar, ConditionalFooter } from "@/components/conditional-chrome";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Bodoni Moda — fonte oficial do wordmark NGT na logo
const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-bodoni",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NOMOS GT — Gestão Tributária",
  description:
    "Menos complexidade, mais segurança, mais oportunidade. Levamos soluções tributárias estratégicas — que antes estavam ao alcance de poucos — para empresas de todos os portes. +R$ 100 milhões em créditos recuperados pelo time NGT.",
  metadataBase: new URL("https://nomosgt.com.br"),
  openGraph: {
    title: "NOMOS GT — Até onde sua empresa pode crescer?",
    description:
      "+R$ 100 milhões em créditos recuperados pelo time NGT. Transformamos tributos em valor, crescimento e resultado.",
    type: "website",
    locale: "pt_BR",
    url: "https://nomosgt.com.br",
    siteName: "NOMOS GT",
    images: [
      {
        url: "/og/og-default.png",
        width: 1200,
        height: 630,
        alt: "NOMOS GT — Até onde sua empresa pode crescer?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NOMOS GT — Gestão Tributária",
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
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${bodoniModa.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased">
        <ConditionalNavbar />
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
      </body>
     </html>
  );
}
