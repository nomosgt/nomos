import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

/**
 * Central do Parceiro v2 — sync de dados com o Supabase.
 * GET  -> snapshot remoto do parceiro logado (cookie ngt_parceiros).
 * PUT  -> grava snapshot { dados } vindo da Central (updated_by: parceiro).
 */

async function resolveParceiro(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (!m) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("parceiros_codigos")
    .select("id, nome, ativo, papel")
    .eq("cookie_hash", m[1])
    .maybeSingle();
  if (!data || !data.ativo) return null;
  return { admin, parceiro: data };
}

/** Remove QUALQUER dado financeiro de um snapshot (visão supervisora). */
function stripFinanceiro(dados: Record<string, unknown> | null) {
  if (!dados) return null;
  const clone = { ...dados };
  delete clone.comissoes;
  return clone;
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data } = await ctx.admin
    .from("parceiro_dados")
    .select("dados, updated_at, updated_by")
    .eq("parceiro_id", ctx.parceiro.id)
    .maybeSingle();

  // ── Supervisor(a): Central normal + visão de TODOS os colaboradores
  //    (SEM financeiro — comissões removidas no servidor) ──
  if (ctx.parceiro.papel === "supervisor") {
    const [codigos, todos] = await Promise.all([
      ctx.admin
        .from("parceiros_codigos")
        .select("id, nome, ativo, papel, ultimo_acesso")
        .eq("papel", "parceiro")
        .order("nome"),
      ctx.admin.from("parceiro_dados").select("parceiro_id, dados, updated_at"),
    ]);
    const map = new Map((todos.data ?? []).map((d) => [d.parceiro_id, d]));
    return NextResponse.json({
      supervisor: true,
      nome: ctx.parceiro.nome,
      dados: data?.dados ?? null,
      updated_at: data?.updated_at ?? null,
      updated_by: data?.updated_by ?? null,
      colaboradores: (codigos.data ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        ativo: c.ativo,
        ultimo_acesso: c.ultimo_acesso,
        dados: stripFinanceiro(
          (map.get(c.id)?.dados as Record<string, unknown> | undefined) ?? null,
        ),
        updated_at: map.get(c.id)?.updated_at ?? null,
      })),
    });
  }

  return NextResponse.json({
    nome: ctx.parceiro.nome,
    dados: data?.dados ?? null,
    updated_at: data?.updated_at ?? null,
    updated_by: data?.updated_by ?? null,
  });
}

export async function PUT(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: { dados?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  if (!body.dados || typeof body.dados !== "object") {
    return NextResponse.json({ error: "dados obrigatorio" }, { status: 422 });
  }
  // guarda-chuva de tamanho (~1MB)
  if (JSON.stringify(body.dados).length > 1_000_000) {
    return NextResponse.json({ error: "Snapshot grande demais" }, { status: 413 });
  }

  const { error } = await ctx.admin.from("parceiro_dados").upsert({
    parceiro_id: ctx.parceiro.id,
    dados: body.dados,
    updated_at: new Date().toISOString(),
    updated_by: "parceiro",
  });
  if (error) {
    return NextResponse.json({ error: "Falha ao sincronizar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
