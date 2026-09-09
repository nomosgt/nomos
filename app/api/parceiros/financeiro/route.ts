import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

/**
 * Folha do parceiro — o colaborador logado vê APENAS o próprio financeiro:
 * percentual, pendente, próximo pagamento e histórico (definidos pelo admin).
 * Supervisores NÃO têm acesso (retorna 403 — regra da Dra. Gabriela).
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (!m) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: p } = await admin
    .from("parceiros_codigos")
    .select("id, nome, ativo, papel, percentual")
    .eq("cookie_hash", m[1])
    .maybeSingle();
  if (!p || !p.ativo) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  if (p.papel === "supervisor") {
    return NextResponse.json({ error: "Perfil de supervisao nao acessa financeiro" }, { status: 403 });
  }

  const { data: fin } = await admin
    .from("parceiro_financeiro")
    .select("percentual, pendente, proximo_pagamento, proximo_valor, historico, observacoes, updated_at")
    .eq("parceiro_id", p.id)
    .maybeSingle();

  return NextResponse.json({
    nome: p.nome,
    percentual: fin?.percentual ?? p.percentual ?? 0,
    pendente: fin?.pendente ?? 0,
    proximo_pagamento: fin?.proximo_pagamento ?? null,
    proximo_valor: fin?.proximo_valor ?? null,
    historico: fin?.historico ?? [],
    observacoes: fin?.observacoes ?? null,
    updated_at: fin?.updated_at ?? null,
  });
}
