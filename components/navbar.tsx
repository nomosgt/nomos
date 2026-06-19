"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

const NAV_LINKS = [
  { href: "/sobre", label: "Sobre" },
  { href: "/servicos", label: "Serviços" },
  { href: "/cnpj", label: "Análise CNPJ" },
  { href: "/simulador", label: "Simulador" },
  { href: "/banco-de-teses", label: "Banco de Teses" },
  { href: "/blog", label: "Blog" },
  { href: "/contato", label: "Contato" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-[color:var(--color-paper)]/85 backdrop-blur-md border-b border-[color:var(--color-hairline)]"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link
              href="/"
              className="group flex items-center text-[color:var(--color-ink)] transition-colors"
              aria-label="NGT — voltar à home"
            >
              <Logo
                variant="full"
                className="h-9 w-auto lg:h-10 transition-colors group-hover:text-[color:var(--color-brand)]"
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-9">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="link-underline text-[13px] font-medium tracking-wide text-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-5">
              <Link
                href="/acesso"
                className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)] transition-colors"
                aria-label="Acessar área restrita (admin ou cliente)"
              >
                ◇ Área restrita
              </Link>
              <Link
                href="/contato"
                className="group inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border border-[color:var(--color-ink)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5"
              >
                Agendar conversa
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>

            <button
              onClick={() => setOpen(true)}
              className="lg:hidden p-2 -mr-2 text-[color:var(--color-ink)]"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-[color:var(--color-background)] lg:hidden"
          >
            <div className="flex items-center justify-between h-16 px-6 border-b border-[color:var(--color-hairline)]">
              <Link href="/" onClick={() => setOpen(false)} className="flex items-center">
                <Logo variant="full" className="h-9 w-auto text-[color:var(--color-ink)]" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col px-6 py-8">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block py-5 font-serif text-3xl border-b border-[color:var(--color-hairline)]"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="mt-10 space-y-4"
              >
                <Link
                  href="/contato"
                  onClick={() => setOpen(false)}
                  className="group inline-flex items-center justify-center gap-2 w-full px-6 py-4 text-sm font-medium bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                >
                  Agendar conversa
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/acesso"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)] transition-colors py-2"
                >
                  ◇ Área restrita
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
// end of Navbar
