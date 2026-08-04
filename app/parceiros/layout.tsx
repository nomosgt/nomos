import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Central do Parceiro — NOMOS GT",
  robots: { index: false, follow: false },
};

export default function ParceirosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
