import Link from "next/link";
import { AlertCircle, ExternalLink, Terminal } from "lucide-react";

/**
 * Tela mostrada quando o admin acessa /admin/* sem .env.local configurado.
 * Não crasha — dá instrução direta de setup.
 */
export function SetupNotice() {
  return (
    <div className="min-h-screen bg-[color:var(--color-ink)] text-[color:var(--color-paper)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono uppercase tracking-[0.25em]">
            <AlertCircle className="w-3 h-3" />
            Backend não configurado
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-paper)]/40 mb-4">
            NGT · Admin
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight">
            Faltam variáveis do Supabase.
          </h1>
          <p className="mt-4 text-[14px] text-[color:var(--color-paper)]/60 max-w-md mx-auto">
            A área admin precisa de um projeto Supabase ativo. Sem ele não há
            onde guardar contatos, simulações nem autenticar acesso.
          </p>
        </div>

        <div className="bg-[color:var(--color-paper)]/5 border border-[color:var(--color-paper)]/15 p-8 space-y-6">
          <Step
            n="1"
            title="Cria o projeto Supabase"
            body="Acesse o dashboard, novo projeto, região São Paulo. Pega URL + 2 chaves (anon + service_role) em Settings → API."
            href="https://supabase.com/dashboard"
            cta="Abrir Supabase"
          />
          <Step
            n="2"
            title="Roda o schema"
            body="SQL Editor → cola lib/db/schema.sql inteiro → Run. Cria 3 tabelas + RLS + dashboard view."
          />
          <Step
            n="3"
            title="Cria .env.local"
            body="Copia .env.local.example → .env.local, cola as 3 chaves. Reinicia npm run dev."
          />
          <Step
            n="4"
            title="Vira admin"
            body="Authentication → Users → Add user (seu email/senha). Pega o UUID e roda: insert into admin_profiles (user_id, nome, role) values ('UUID', 'Éverton', 'superadmin');"
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-[12px] text-[color:var(--color-paper)]/40">
            Passo a passo completo:{" "}
            <code className="font-mono text-[color:var(--color-brand-soft)]">
              BACKEND.md
            </code>{" "}
            na raiz do projeto.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  href,
  cta,
}: {
  n: string;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[color:var(--color-brand)] flex items-center justify-center font-mono text-[11px] text-[color:var(--color-paper)]">
        {n}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-[14px] mb-1">{title}</h3>
        <p className="text-[13px] text-[color:var(--color-paper)]/60 leading-relaxed">
          {body}
        </p>
        {href && cta && (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-brand-soft)] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}

export const _icons = { Terminal };
