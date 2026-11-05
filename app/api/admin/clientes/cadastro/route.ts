import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id, nome").eq("user_id", u.user.id).maybeSingle();
  return prof ? { id: u.user.id, nome: (prof as { nome?: string }).nome || "Admin" } : null;
}

/** Validação de CNPJ (14 dígitos + dígitos verificadores). */
function cnpjValido(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base: string, pesos: number[]) => {
    const soma = base.split("").reduce((a, d, i) => a + Number(d) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

const schema = z.object({
  client_id: z.string().uuid(),
  nome: z.string().min(2).max(200).optional(),          // contato / responsável
  empresa: z.string().max(200).optional().nullable(),   // razão social
  nome_fantasia: z.string().max(200).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  cargo: z.string().max(120).optional().nullable(),
  telefone: z.string().max(40).optional().nullable(),
  consultor: z.string().max(120).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
});

const CAMPOS = ["nome", "empresa", "nome_fantasia", "cnpj", "cargo", "telefone", "consultor", "observacoes"] as const;

/** PATCH — edita dados cadastrais do cliente (não toca identidade de autenticação nem vínculos). */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const { client_id, ...campos } = parsed.data;

  // CNPJ: valida quando informado e não vazio
  if (campos.cnpj !== undefined && campos.cnpj !== null && campos.cnpj.replace(/\D/g, "") !== "") {
    if (!cnpjValido(campos.cnpj)) return NextResponse.json({ error: "CNPJ inválido." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: antes } = await admin.from("client_profiles")
    .select("nome, empresa, nome_fantasia, cnpj, cargo, telefone, consultor, observacoes")
    .eq("user_id", client_id).maybeSingle();
  if (!antes) return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });

  // monta o update só com o que mudou
  const updates: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    if (campos[c] !== undefined) {
      const novo = campos[c] === "" ? null : campos[c];
      if (novo !== (antes as Record<string, unknown>)[c]) updates[c] = novo;
    }
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true, semAlteracoes: true });

  const { error } = await admin.from("client_profiles").update(updates).eq("user_id", client_id);
  if (error) {
    const falta = /nome_fantasia|consultor|observacoes|column|schema cache/i.test(error.message);
    return NextResponse.json({ error: falta ? "Rode o SQL do cadastro-v20 no Supabase." : "Falha ao salvar" }, { status: falta ? 503 : 500 });
  }

  // auditoria campo a campo (best-effort, tolera ausência da tabela)
  try {
    const linhas = Object.keys(updates).map((campo) => ({
      client_id, campo,
      valor_anterior: (antes as Record<string, unknown>)[campo] != null ? String((antes as Record<string, unknown>)[campo]) : null,
      valor_novo: updates[campo] != null ? String(updates[campo]) : null,
      autor: adminUser.id, autor_nome: adminUser.nome,
    }));
    await admin.from("client_profile_audit").insert(linhas);
  } catch { /* tabela ausente antes do v20 */ }

  return NextResponse.json({ ok: true, alterados: Object.keys(updates) });
}

/** GET ?client_id= → histórico cadastral. */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const clientId = new URL(req.url).searchParams.get("client_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return NextResponse.json({ error: "client_id invalido" }, { status: 422 });
  const admin = createAdminClient();
  const { data } = await admin.from("client_profile_audit")
    .select("campo, valor_anterior, valor_novo, autor_nome, created_at")
    .eq("client_id", clientId).order("created_at", { ascending: false }).limit(50);
  return NextResponse.json({ historico: data ?? [] });
}
