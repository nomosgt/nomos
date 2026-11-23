/** Valida as queries das 9 telas novas (somente leitura). */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log("PASS ", n, e); } else { fail++; console.log("FAIL ", n, e); } };

// /admin/mensagens
const m = await db.from("case_messages").select("id, client_id, autor_tipo, conteudo, lido, created_at").order("created_at", { ascending: false }).limit(5);
ok("mensagens: select consolidado", !m.error, m.error?.message || `${m.data?.length} msgs`);

// /admin/auditoria
for (const [t, sel] of [
  ["client_profile_audit", "id, created_at, campo, valor_anterior, valor_novo, autor_nome"],
  ["case_audit", "id, created_at, campo, valor_anterior, valor_novo, autor_nome"],
  ["empresa_dados_audit", "id, created_at, campo, valor_anterior, valor_novo, autor_nome, justificativa"],
  ["atividade_historico", "id, created_at, evento, autor"],
  ["analise_eventos", "id, created_at, evento, detalhe, autor"],
]) {
  const r = await db.from(t).select(sel).order("created_at", { ascending: false }).limit(3);
  ok(`auditoria: ${t}`, !r.error, r.error?.message.slice(0, 70) || `${r.data?.length} eventos`);
}

// /admin/usuarios
const a = await db.from("admin_profiles").select("user_id, nome, role");
ok("usuarios: admin_profiles", !a.error, a.error?.message || `${a.data?.length} admins`);
const pz = await db.from("parceiros_codigos").select("id, codigo, nome, papel, ativo, ultimo_acesso").order("criado_em", { ascending: false });
ok("usuarios: parceiros_codigos", !pz.error, pz.error?.message || `${pz.data?.length} colaboradores`);
if (a.data?.[0]) {
  const em = await db.auth.admin.getUserById(a.data[0].user_id);
  ok("usuarios: auth.admin.getUserById", !em.error && !!em.data.user, em.error?.message || "email ok");
}

// /sala/financeiro (ledger por client_id — coluna real: tipo)
const cli = await db.from("client_profiles").select("user_id").limit(1);
if (cli.data?.[0]) {
  const l = await db.from("case_financeiro").select("id, created_at, tipo, valor, descricao, case_titulo").eq("client_id", cli.data[0].user_id).order("created_at", { ascending: false }).limit(5);
  ok("sala/financeiro: ledger por cliente", !l.error, l.error?.message.slice(0, 70) || `${l.data?.length} lançamentos`);
}

// /sala/relatorios
const d = await db.from("case_documents").select("id, nome, storage_path, categoria, client_cases!inner(client_id, titulo)").eq("visibilidade", "cliente").eq("arquivado", false).in("categoria", ["relatorio", "parecer"]).limit(5);
ok("sala/relatorios: filtro categoria", !d.error, d.error?.message.slice(0, 70) || `${d.data?.length} docs`);

// /sala/deadline
const r2 = await db.from("reunioes").select("id, titulo, data_confirmada").eq("status", "confirmada").limit(3);
ok("sala/deadline: reunioes confirmadas", !r2.error, r2.error?.message || `${r2.data?.length}`);

console.log(`\nRESULTADO: ${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
