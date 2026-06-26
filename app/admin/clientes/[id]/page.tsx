import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { ClientePainel } from "@/components/admin/cliente-painel";

export const dynamic = "force-dynamic";

export default async function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [cli, casos, msgs] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("client_cases").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase
      .from("case_messages")
      .select("id, created_at, conteudo, autor_tipo, lido")
      .eq("client_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!cli.data) notFound();
  const cliente = cli.data;

  return (
    <div className="space-y-8 max-w-5xl">
      <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]">
        <ArrowLeft className="w-3 h-3" /> Clientes
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-1">{cliente.nome}</h1>
          <p className="text-[14px] text-[color:var(--color-ink-muted)]">
            {cliente.empresa || "—"}
            {cliente.cnpj && <span className="font-mono ml-3 text-[12px]">{cliente.cnpj}</span>}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1">
            Caixa recuperado
          </div>
          <div className="font-mono text-2xl text-[color:var(--color-brand)]">
            {formatBRL(Number(cliente.caixa_recuperado_total))}
          </div>
        </div>
      </div>

      <ClientePainel
        clienteId={id}
        clienteInicial={cliente}
        casosIniciais={casos.data || []}
        mensagensIniciais={msgs.data || []}
      />

      <div className="flex items-center gap-3 pt-4 border-t border-[color:var(--color-hairline)]">
        <Link
          href={`https://wa.me/${cliente.telefone?.replace(/\D/g, "") || "5511933333841"}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-mono uppercase tracking-[0.2em] bg-[#25D366] text-white hover:-translate-y-0.5 transition-transform"
        >
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </Link>
        <a
          href={`mailto:`}
          className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-mono uppercase tracking-[0.2em] border border-[color:var(--color-hairline)] hover:border-[color:var(--color-ink)]"
        >
          E-mail
        </a>
      </div>
    </div>
  );
}
