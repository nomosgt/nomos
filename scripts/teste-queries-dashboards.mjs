/** Valida as queries exatas usadas pelos dashboards/páginas novas (somente leitura). */
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

// /admin (dashboard)
const q1 = await db.from("client_cases").select("id, titulo, status, etapa, potencial_estimado, valor_recuperado, client_id, client_profiles ( nome, empresa )").neq("status", "arquivado").limit(400);
ok("dash: client_cases + embed", !q1.error, q1.error?.message || `${q1.data?.length} casos`);
const q2 = await db.from("atividades").select("id, titulo, status, prazo, parceiros_codigos ( nome )").not("status", "in", "(concluida,cancelada)").limit(400);
ok("dash: atividades not-in + embed", !q2.error, q2.error?.message || `${q2.data?.length} abertas`);
const q3 = await db.from("analises").select("id, titulo, status").eq("status", "enviada").limit(100);
ok("dash: analises enviadas", !q3.error, q3.error?.message || `${q3.data?.length}`);
const q4 = await db.from("client_aprovacoes").select("id").eq("status", "pendente").limit(200);
ok("dash: aprovacoes pendentes", !q4.error, q4.error?.message || `${q4.data?.length}`);
const q5 = await db.from("reunioes").select("id, titulo, solicitante_nome, data_sugerida, criado_em").eq("status", "solicitada").order("criado_em", { ascending: false }).limit(5);
ok("dash: reunioes solicitadas", !q5.error, q5.error?.message || `${q5.data?.length}`);
const q6 = await db.from("indicacoes").select("id, empresa, parceiro_nome, criado_em").eq("status", "recebida").order("criado_em", { ascending: false }).limit(5);
ok("dash: indicacoes recebidas", !q6.error, q6.error?.message || `${q6.data?.length}`);

// /admin/projetos
const q7 = await db.from("client_cases").select("id, titulo, tese, status, etapa, potencial_estimado, valor_recuperado, data_estimada_conclusao, created_at, client_id, client_profiles ( nome, empresa )").neq("status", "arquivado").order("created_at", { ascending: false }).limit(300);
ok("projetos: query completa", !q7.error, q7.error?.message || `${q7.data?.length}`);

// /admin/deadline
const q8 = await db.from("atividades").select("id, titulo, status, prioridade, prazo, parceiro_id, parceiros_codigos ( nome ), client_profiles ( nome, empresa )").not("status", "in", "(concluida,cancelada)").order("prazo", { ascending: true, nullsFirst: false }).limit(300);
ok("deadline: query completa (duplo embed)", !q8.error, q8.error?.message || `${q8.data?.length}`);

// /api/admin/reunioes GET (select completo)
const q9 = await db.from("reunioes").select("id, solicitante_tipo, solicitante_nome, titulo, detalhes, data_sugerida, data_confirmada, status, criado_em, client_id, parceiro_id, client_profiles ( nome, empresa ), parceiros_codigos ( nome )").order("criado_em", { ascending: false }).limit(5);
ok("api reunioes: select+embeds", !q9.error, q9.error?.message || "");

// /api/admin/horas GET
const q10 = await db.from("horas_estimativas").select("id, client_id, titulo, descricao, horas, valor, status, decidido_em, criado_em, client_profiles ( nome, empresa )").order("criado_em", { ascending: false }).limit(5);
ok("api horas: select+embed", !q10.error, q10.error?.message || "");
const q11 = await db.from("client_profiles").select("user_id, nome, empresa").order("nome").limit(50);
ok("api horas: lista clientes", !q11.error, q11.error?.message || `${q11.data?.length} clientes`);

console.log(`\nRESULTADO: ${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
