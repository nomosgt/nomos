import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginArche } from "@/components/acesso/login-arche";

export const metadata: Metadata = {
  title: "Sala Arché · Entrar",
  robots: { index: false, follow: false },
};

export default function SalaLoginPage() {
  return (
    <Suspense>
      <LoginArche initialRole="cliente" />
    </Suspense>
  );
}
