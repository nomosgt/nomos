import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PageHeader, Cd, StTag, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

/**
 * Admin · Mensagens — caixa consolidada: todos os clientes com última
 * mensagem e não lidas, abrindo a conversa no painel de cada cliente.
 */
export default async function AdminMensagensPage() {
  if (!isSupabaseConfigured()) return null;
  const admin = createAdminClient();

  const [clientes, msgs] = await Promise.all([
    admin.from("client_profiles").select("user_id, nome, empresa").order("nome"),
    admin
      .from("case_messages")
      .select("id, client_id, autor_tipo, conteudo, lido, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  type Resumo = { ultima: string | null; ultimaEm: string | null; naoLidas: number; total: number };
  const porCliente = new Map<string, Resumo>();
  for (const c of clientes.data ?? []) porCliente.set(c.user_id, { ultima: null, ultimaEm: null, naoLidas: 0, total: 0 });
  for (const m of msgs.data ?? []) {
    const r = porCliente.get(m.client_id as string);
    if (!r) continue;
    r.total++;
    if (!r.ultimaEm) { r.ultima = (m.conteudo as string) || "(arquivo)"; r.ultimaEm = m.created_at as string; }
    if (m.autor_tipo === "cliente" && !m.lido) r.naoLidas++;
  }
  const lista = (clientes.data ?? [])
    .map((c) => ({ ...c, ...porCliente.get(c.user_id)! }))
    .sort((a, b) => (b.ultimaEm || "").localeCompare(a.ultimaEm || ""));
  const totalNaoLidas = lista.reduce((a, c) => a + c.naoLidas, 0);

  return (
    <div>
      <PageHeader eyebrow="Clientes" title="Mensagens" sub={`Conversas com todos os clientes · ${totalNaoLidas} não lida(s)`} />
      <Cd title="Conversas" mono={`${lista.length} cliente(s)`}>
        {lista.length === 0 ? (
          <p className="text-[13px] text-[#8a8ca3]">Nenhum cliente cadastrado.</p>
        ) : (
          <div className="space-y-2.5">
            {lista.map((c) => (
              <Link
                key={c.user_id}
                href={`/admin/clientes/${c.user_id}`}
                className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#efece6] px-4 py-3.5 transition-colors hover:border-[#0f1240]"
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#3a40c9] text-[12px] font-semibold text-white">
                  {(c.empresa || c.nome || "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-[#0f1240]">{c.empresa || c.nome}</div>
                  <div className="truncate font-mono text-[11px] text-[#8a8ca3]">
                    {c.ultima ? c.ultima.slice(0, 90) : "sem mensagens ainda"}
                  </div>
                </div>
                {c.ultimaEm && <span className="font-mono text-[11px] text-[#8a8ca3]">{fmtData(c.ultimaEm, true)}</span>}
                {c.naoLidas > 0 && <StTag tone="warn">{c.naoLidas} não lida(s)</StTag>}
              </Link>
            ))}
          </div>
        )}
      </Cd>
    </div>
  );
}
