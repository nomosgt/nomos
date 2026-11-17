import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginArche } from "@/components/acesso/login-arche";

export const metadata: Metadata = {
  title: "Entrar · Admin Arché",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginArche initialRole="equipe" />
    </Suspense>
  );
}
