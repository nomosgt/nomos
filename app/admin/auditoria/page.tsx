import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PageHeader, Cd, StTag, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

type Evento = { id: string; quando: string; origem: string; quem: string; o_que: string };

async function tolerante<T>(p: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  try {
    const r = await p;
    return r.error ? [] : (r.data ?? []);
  } catch {
    return [];
  }
}

/**
 * Admin · Auditoria — feed consolidado e somente-leitura de TODAS as
 * trilhas reais do sistema (cadastro, casos, dados empresariais,
 * histórico de atividades e eventos de análises). Nada é editável aqui.
 */
export default async function AuditoriaPage() {
  if (!isSupabaseConfigured()) return null;
  const admin = createAdminClient();

  const [cad, caso, emp, ativ, anal] = await Promise.all([
    tolerante<{ id: string; created_at: string; campo: string; valor_anterior: string | null; valor_novo: string | null; autor_nome: string | null }>(
      admin.from("client_profile_audit").select("id, created_at, campo, valor_anterior, valor_novo, autor_nome").order("created_at", { ascending: false }).limit(60),
    ),
    tolerante<{ id: string; created_at: string; campo: string; valor_anterior: string | null; valor_novo: string | null; autor_nome: string | null }>(
      admin.from("case_audit").select("id, created_at, campo, valor_anterior, valor_novo, autor_nome").order("created_at", { ascending: false }).limit(60),
    ),
    tolerante<{ id: string; created_at: string; campo: string; valor_anterior: string | null; valor_novo: string | null; autor_nome: string | null; justificativa: string | null }>(
      admin.from("empresa_dados_audit").select("id, created_at, campo, valor_anterior, valor_novo, autor_nome, justificativa").order("created_at", { ascending: false }).limit(60),
    ),
    tolerante<{ id: string; created_at: string; evento: string; autor: string | null }>(
      admin.from("atividade_historico").select("id, created_at, evento, autor").order("created_at", { ascending: false }).limit(60),
    ),
    tolerante<{ id: string; created_at: string; evento: string; detalhe: string | null; autor: string | null }>(
      admin.from("analise_eventos").select("id, created_at, evento, detalhe, autor").order("created_at", { ascending: false }).limit(60),
    ),
  ]);

  const eventos: Evento[] = [
    ...cad.map((e) => ({ id: "c" + e.id, quando: e.created_at, origem: "Cadastro", quem: e.autor_nome || "—", o_que: `${e.campo}: "${e.valor_anterior ?? "—"}" → "${e.valor_novo ?? "—"}"` })),
    ...caso.map((e) => ({ id: "k" + e.id, quando: e.created_at, origem: "Caso", quem: e.autor_nome || "—", o_que: `${e.campo}: "${e.valor_anterior ?? "—"}" → "${e.valor_novo ?? "—"}"` })),
    ...emp.map((e) => ({ id: "e" + e.id, quando: e.created_at, origem: "Dados empresariais", quem: e.autor_nome || "—", o_que: `${e.campo}: "${e.valor_anterior ?? "—"}" → "${e.valor_novo ?? "—"}"${e.justificativa ? ` (justificativa: ${e.justificativa})` : ""}` })),
    ...ativ.map((e) => ({ id: "a" + e.id, quando: e.created_at, origem: "Atividade", quem: e.autor || "—", o_que: e.evento })),
    ...anal.map((e) => ({ id: "n" + e.id, quando: e.created_at, origem: "Análise", quem: e.autor || "—", o_que: `${e.evento}${e.detalhe ? ` — ${e.detalhe}` : ""}` })),
  ].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 120);

  const CORES: Record<string, "ok" | "warn" | "bad" | "info"> = {
    Cadastro: "info", Caso: "info", "Dados empresariais": "warn", Atividade: "ok", "Análise": "info",
  };

  return (
    <div>
      <PageHeader eyebrow="Administração" title="Auditoria" sub="Trilha consolidada de alterações — quem mudou o quê, quando. Somente leitura." />
      <Cd title="Histórico" mono={`${eventos.length} eventos recentes`}>
        {eventos.length === 0 ? (
          <p className="text-[13px] text-[#8a8ca3]">Nenhum evento de auditoria registrado ainda.</p>
        ) : (
          <div className="space-y-2.5">
            {eventos.map((e) => (
              <div key={e.id} className="flex flex-wrap items-start gap-3 border-b border-[#f1eee8] pb-2.5 last:border-0">
                <span className="w-[120px] flex-none font-mono text-[11px] text-[#8a8ca3]">{fmtData(e.quando, true)}</span>
                <StTag tone={CORES[e.origem] || "info"}>{e.origem}</StTag>
                <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-[#14173d]">{e.o_que}</span>
                <span className="font-mono text-[11px] text-[#8a8ca3]">{e.quem}</span>
              </div>
            ))}
          </div>
        )}
      </Cd>
    </div>
  );
}
