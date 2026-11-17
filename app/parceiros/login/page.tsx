import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginArche } from "@/components/acesso/login-arche";

export const metadata: Metadata = {
  title: "Central do Parceiro · Entrar",
  robots: { index: false, follow: false },
};

export default function ParceirosLoginPage() {
  return (
    <Suspense>
      <LoginArche initialRole="parceiro" />
    </Suspense>
  );
}
