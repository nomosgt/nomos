import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Users, Handshake, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Acesso · Arché",
  robots: { index: false, follow: false },
};

/**
 * Seletor de acesso — réplica do overlay "Como você quer entrar?" do
 * protótipo oficial (ov.acc + roles): fundo #0b1129, grid radial,
 * título com itálico iris e cards de perfil com seta animada.
 */
export default function AcessoPage() {
  return (
    <div className="relative min-h-screen overflow-auto bg-[#0b1129] text-white">
      {/* gridbg do protótipo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center,#000 30%,transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center,#000 30%,transparent 75%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[1340px] flex-col justify-center px-[clamp(20px,5vw,88px)] pb-16 pt-24">
        <div className="mb-14 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-55">
            Arché · Acesso restrito
          </div>
          <h2
            className="mt-4 font-serif font-light tracking-[-0.01em]"
            style={{ fontSize: "clamp(44px,5vw,76px)" }}
          >
            Como você quer{" "}
            <em className="italic text-[#8f95ff]">entrar?</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.015] md:grid-cols-3">
          <RoleCard
            href="/sala/login"
            icon={Users}
            tag="Cliente"
            title="Sala Arché"
            description="Acompanhe seus projetos, deadline, aprovações, documentos e financeiro em tempo real."
          />
          <RoleCard
            href="/parceiros/login"
            icon={Handshake}
            tag="Parceiro"
            title="Central do Parceiro"
            description="Demandas, trabalhos para aprovação, projetos e materiais compartilhados pela Arché."
          />
          <RoleCard
            href="/admin/login"
            icon={Shield}
            tag="Equipe Arché"
            title="Administração"
            description="CRM interno: projetos, delegação, deadline, financeiro, usuários e permissões."
            last
          />
        </div>

        <p className="mt-9 text-center font-mono text-[11px] uppercase tracking-[0.18em] opacity-40">
          Conexão criptografada · Acesso individual
        </p>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40 transition-colors hover:text-[#8f95ff]"
          >
            ← Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  href,
  icon: Icon,
  tag,
  title,
  description,
  last,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tag: string;
  title: string;
  description: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex min-h-[290px] flex-col px-8 pb-10 pt-9 text-left transition-colors duration-500 hover:bg-white/[0.04] ${
        last ? "" : "border-b border-white/[0.12] md:border-b-0 md:border-r"
      }`}
    >
      <div className="mb-auto flex items-start justify-between opacity-75">
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.4} />
        <ArrowUpRight
          className="h-[22px] w-[22px] transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
          strokeWidth={1.4}
        />
      </div>
      <div className="mb-3.5 mt-12 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8f95ff]">
        {tag}
      </div>
      <b className="font-serif text-[34px] font-normal leading-[1.1]">{title}</b>
      <p className="mt-3 max-w-[300px] text-[14px] leading-relaxed opacity-60">{description}</p>
    </Link>
  );
}
