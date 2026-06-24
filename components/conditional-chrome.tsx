"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

/**
 * Esconde o Navbar/Footer público nas áreas restritas (/admin, /sala, /acesso).
 * Cada uma dessas áreas tem seu próprio header dedicado.
 */
function isRestrictedArea(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/sala") ||
    pathname === "/acesso"
  );
}

export function ConditionalNavbar() {
  const pathname = usePathname();
  if (isRestrictedArea(pathname)) return null;
  return <Navbar />;
}

export function ConditionalFooter() {
  const pathname = usePathname();
  if (isRestrictedArea(pathname)) return null;
  return <Footer />;
}
