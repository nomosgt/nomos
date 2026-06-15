import Link from "next/link";
import { ArrowUpRight, Instagram } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const FOOTER_LINKS = {
  Site: [
    { href: "/sobre", label: "Sobre" },
    { href: "/servicos", label: "Serviços" },
    { href: "/cnpj", label: "Análise CNPJ" },
    { href: "/simulador", label: "Simulador" },
    { href: "/banco-de-teses", label: "Banco de Teses" },
    { href: "/blog", label: "Blog" },
    { href: "/contato", label: "Contato" },
  ],
  Contato: [
    {
      href: "mailto:nomosgtorg@gmail.com",
      label: "nomosgtorg@gmail.com",
    },
    {
      href: "https://wa.me/5519995619838",
      label: "+55 19 99561-9838",
      external: true,
    },
    {
      href: "https://instagram.com/nomosgt",
      label: "@nomosgt",
      external: true,
    },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-[color:var(--color-hairline)] bg-[color:var(--color-background)]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12 py-16 lg:py-24">
        {/* Logo NGT gigante (símbolo + wordmark) */}
        <div className="flex items-end justify-between gap-10 flex-wrap mb-16">
          <Link href="/" className="block group" aria-label="NGT — voltar à home">
            <Logo
              variant="full"
              className="h-28 w-auto lg:h-40 text-[color:var(--color-ink)] transition-colors group-hover:text-[color:var(--color-brand)]"
            />
            <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)]">
              Gestão Tributária
            </div>
          </Link>

          <Link
            href="/contato"
            className="group inline-flex items-center gap-2 px-5 py-3 border border-[color:var(--color-ink)] text-[13px] font-medium hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)] transition-all duration-300"
          >
            Falar com a NOMOS
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-20">
          {/* Manifesto */}
          <div className="col-span-2 md:col-span-2 max-w-md">
            <p className="font-serif text-xl lg:text-2xl leading-tight text-[color:var(--color-ink)]">
              Tributário não é custo. É oportunidade mal lida.
            </p>
            <p className="mt-6 text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
              Consultoria fiscal-tributária para empresas que entendem que cada
              real importa. Atuação técnica, discreta e mensurável.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-5">
                {title}
              </div>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      target={"external" in link && link.external ? "_blank" : undefined}
                      rel={"external" in link && link.external ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1 text-[13px] text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)] transition-colors"
                    >
                      {link.label}
                      {"external" in link && link.external && (
                        <ArrowUpRight className="w-3 h-3 opacity-50" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-20 pt-8 border-t border-[color:var(--color-hairline)] flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="text-[12px] text-[color:var(--color-ink-muted)]">
              © {new Date().getFullYear()} NOMOS GT · Todos os direitos reservados
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
              OAB/SP — em breve · Éverton Vicente
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)] transition-colors"
            >
              ◇ Área restrita
            </Link>
            <Link
              href="https://instagram.com/nomosgt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[12px] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition-colors"
            >
              <Instagram className="w-3.5 h-3.5" />
              @nomosgt
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
// end of Footer
