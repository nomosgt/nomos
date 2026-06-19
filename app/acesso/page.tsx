import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Users, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Acesso · NOMOS GT",
  robots: { index: false, follow: false },
};

export default function AcessoPage() {
  return (
    <div className="min-h-screen bg-[color:var(--color-ink)] text-[color:var(--color-paper)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-12 lg:mb-16">
          <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-paper)]/50 mb-4">
            NGT · Acesso restrito
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl tracking-tight">
            Como você quer entrar?
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-paper)]/10 border border-[color:var(--color-paper)]/10">
          <Card
            href="/sala/login"
            icon={Users}
            tag="Cliente"
            title="Sala NGT"
            description="Acompanhe seu caso, mensagens, documentos e suporte direto."
          />
          <Card
            href="/admin/login"
            icon={Shield}
            tag="Equipe NGT"
            title="Administração"
            description="Painel interno: contatos, simulações, blog, clientes, análises."
          />
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-[12px] font-mono uppercase tracking-[0.25em] text-[color:var(--color-paper)]/40 hover:text-[color:var(--color-brand-soft)] transition-colors"
          >
            ← Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({
  href,
  icon: Icon,
  tag,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tag: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-[color:var(--color-ink)] p-8 lg:p-12 transition-colors duration-300 hover:bg-[color:var(--color-paper)]/5 flex flex-col"
    >
      <div className="flex items-start justify-between mb-10">
        <Icon
          className="w-6 h-6 text-[color:var(--color-brand-soft)]"
          strokeWidth={1.3}
        />
        <ArrowUpRight className="w-5 h-5 text-[color:var(--color-paper)]/30 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-[color:var(--color-brand-soft)]" />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand-soft)] mb-4">
        ◇ {tag}
      </div>
      <h2 className="font-serif text-3xl tracking-tight mb-3">{title}</h2>
      <p className="text-[14px] leading-relaxed text-[color:var(--color-paper)]/55 flex-1">
        {description}
      </p>
    </Link>
  );
}
