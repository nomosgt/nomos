import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Admin · Central de Teses (acervo próprio).
 * GET    ?q=&tributo=&risco=&setor=&status= → busca/filtra
 * POST   { ...tese } → cria
 * PATCH  { id, ...campos } → edita
 * DELETE ?id= → remove
 */

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return Boolean(prof);
}

function hint(msg: string) {
  return msg.includes("does not exist")
    ? "Tabela de teses nao configurada — rode o SQL do teses-v9 no Supabase."
    : null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const admin = createAdminClient();
  let query = admin.from("teses").select("*").order("destaque", { ascending: false }).order("updated_at", { ascending: false });

  const tributo = sp.get("tributo");
  const risco = sp.get("risco");
  const setor = sp.get("setor");
  const status = sp.get("status");
  if (tributo) query = query.contains("tributos", [tributo]);
  if (setor) query = query.contains("setores", [setor]);
  if (risco) query = query.eq("risco", risco);
  if (status) query = query.eq("status_jur", status);

  const { data, error } = await query.limit(500);
  if (error) {
    return NextResponse.json({ error: hint(error.message) || "Falha ao listar" }, { status: 500 });
  }

  // busca textual em memória (acento-insensível) sobre nome/resumo/fundamento/precedente/tags
  const q = (sp.get("q") || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let teses = data ?? [];
  if (q) {
    teses = teses.filter((t) => {
      const blob = [t.nome, t.resumo, t.fundamento, t.precedente, (t.tags || []).join(" "), (t.tributos || []).join(" "), (t.setores || []).join(" ")]
        .join(" ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return blob.includes(q);
    });
  }
  return NextResponse.json({ teses });
}

const camposSchema = z.object({
  nome: z.string().min(3).max(200),
  tributos: z.array(z.string().max(30)).max(12).optional(),
  resumo: z.string().min(3).max(2000),
  fundamento: z.string().max(2000).optional().nullable(),
  precedente: z.string().max(300).optional().nullable(),
  esfera: z.enum(["judicial", "administrativa", "ambas"]).optional(),
  status_jur: z.enum(["tese_firmada", "consolidada", "em_discussao", "modulada", "oportunidade"]).optional(),
  setores: z.array(z.string().max(40)).max(20).optional(),
  regimes: z.array(z.string().max(30)).max(6).optional(),
  risco: z.enum(["baixo", "medio", "alto"]).optional(),
  retroatividade: z.string().max(120).optional().nullable(),
  potencial: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  fonte_url: z.string().max(500).optional().nullable(),
  observacoes: z.string().max(4000).optional().nullable(),
  destaque: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = camposSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const base = slugify(parsed.data.nome) || "tese";
  const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await admin
    .from("teses")
    .insert({ ...parsed.data, slug, updated_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: hint(error.message) || "Falha ao criar" }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const schema = camposSchema.partial().extend({ id: z.string().uuid() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const { id, ...updates } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
    .from("teses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });
  const admin = createAdminClient();
  const { error } = await admin.from("teses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao excluir" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
