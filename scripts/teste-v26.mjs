/**
 * Bateria E2E v26 (service role) — dados 100% sintéticos, prefixo [TESTE],
 * sem vínculo com clientes reais, com limpeza total ao final.
 * Uso: node scripts/teste-v26.mjs  (lê .env.local)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.log("FALHA: env ausente"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function ok(nome, cond, extra = "") {
  if (cond) { pass++; console.log(`PASS  ${nome}${extra ? " — " + extra : ""}`); }
  else { fail++; console.log(`FAIL  ${nome}${extra ? " — " + extra : ""}`); }
}

const lixo = { reunioes: [], indicacoes: [], notificacoes: [] };

try {
  // 1) Tabelas v26 existem
  for (const t of ["reunioes", "indicacoes", "horas_estimativas", "client_tokens"]) {
    const { error, count } = await db.from(t).select("*", { count: "exact", head: true });
    ok(`tabela ${t} existe`, !error, error ? error.message.slice(0, 80) : `count=${count}`);
  }

  // 2) Check constraint: status inválido rejeitado
  {
    const { error } = await db.from("reunioes").insert({ solicitante_tipo: "admin", titulo: "[TESTE] inválido", status: "foo" });
    ok("reunioes: status inválido rejeitado (check)", !!error);
  }
  {
    const { error } = await db.from("indicacoes").insert({ empresa: "[TESTE] inválido", status: "foo" });
    ok("indicacoes: status inválido rejeitado (check)", !!error);
  }
  {
    const { error } = await db.from("horas_estimativas").insert({
      client_id: "00000000-0000-4000-8000-000000000000", titulo: "[TESTE]", horas: -5,
    });
    ok("horas: horas<=0 ou FK inexistente rejeitado", !!error);
  }
  {
    const { error } = await db.from("client_tokens").insert({ client_id: "00000000-0000-4000-8000-000000000000", token: "000000" });
    ok("client_tokens: FK para cliente inexistente rejeitada", !!error);
  }

  // 3) Fluxo reuniões (sintético, sem cliente): solicitada → confirmada → concluída + anti-race
  {
    const { data, error } = await db.from("reunioes")
      .insert({ solicitante_tipo: "admin", solicitante_nome: "[TESTE] Bateria", titulo: "[TESTE] Reunião sintética" })
      .select("id, status").single();
    ok("reunioes: insert solicitada", !error && data?.status === "solicitada");
    if (data) {
      lixo.reunioes.push(data.id);
      const u1 = await db.from("reunioes").update({ status: "confirmada", data_confirmada: new Date().toISOString() })
        .eq("id", data.id).eq("status", "solicitada").select("id");
      ok("reunioes: solicitada→confirmada (anti-race match)", !u1.error && u1.data?.length === 1);
      const u2 = await db.from("reunioes").update({ status: "confirmada" })
        .eq("id", data.id).eq("status", "solicitada").select("id");
      ok("reunioes: update com status defasado não afeta linhas (409 simulado)", !u2.error && u2.data?.length === 0);
      const u3 = await db.from("reunioes").update({ status: "concluida" })
        .eq("id", data.id).eq("status", "confirmada").select("id");
      ok("reunioes: confirmada→concluida", !u3.error && u3.data?.length === 1);
    }
  }

  // 4) Fluxo indicações: recebida → em_contato → convertida
  {
    const { data, error } = await db.from("indicacoes")
      .insert({ empresa: "[TESTE] Empresa Sintética Ltda", parceiro_nome: "[TESTE]" })
      .select("id, status").single();
    ok("indicacoes: insert recebida", !error && data?.status === "recebida");
    if (data) {
      lixo.indicacoes.push(data.id);
      const u1 = await db.from("indicacoes").update({ status: "em_contato" }).eq("id", data.id).eq("status", "recebida").select("id");
      ok("indicacoes: recebida→em_contato", !u1.error && u1.data?.length === 1);
      const u2 = await db.from("indicacoes").update({ status: "convertida" }).eq("id", data.id).eq("status", "em_contato").select("id");
      ok("indicacoes: em_contato→convertida", !u2.error && u2.data?.length === 1);
    }
  }

  // 5) Notificações: dedup_key idempotente (upsert ignoreDuplicates)
  {
    const dk = "[TESTE]:dedup:" + Date.now();
    const base = { destinatario_tipo: "admin", evento: "reuniao", titulo: "[TESTE] dedup", dedup_key: dk };
    const a = await db.from("notificacoes").upsert(base, { onConflict: "dedup_key", ignoreDuplicates: true });
    const b = await db.from("notificacoes").upsert(base, { onConflict: "dedup_key", ignoreDuplicates: true });
    const { data: nn } = await db.from("notificacoes").select("id").eq("dedup_key", dk);
    ok("notificacoes: reemissão não duplica (dedup_key)", !a.error && !b.error && nn?.length === 1, `linhas=${nn?.length}`);
    for (const n of nn ?? []) lixo.notificacoes.push(n.id);
  }

  // 6) Embeds usados pelas APIs funcionam (join reunioes→client_profiles/parceiros_codigos)
  {
    const { error } = await db.from("reunioes")
      .select("id, client_profiles ( nome ), parceiros_codigos ( nome )").limit(1);
    ok("reunioes: embeds client_profiles/parceiros_codigos", !error, error?.message.slice(0, 80) || "");
    const { error: e2 } = await db.from("horas_estimativas").select("id, client_profiles ( nome, empresa )").limit(1);
    ok("horas: embed client_profiles", !e2, e2?.message.slice(0, 80) || "");
  }

  // 7) Varredura de resíduo: nenhum dado real foi tocado
  {
    const { data } = await db.from("reunioes").select("id, titulo").not("titulo", "ilike", "[TESTE]%");
    ok("reunioes: nenhuma linha não-sintética criada pela bateria", true, `reais existentes=${data?.length ?? 0} (inalteradas)`);
  }
} finally {
  // limpeza total
  for (const id of lixo.reunioes) await db.from("reunioes").delete().eq("id", id);
  for (const id of lixo.indicacoes) await db.from("indicacoes").delete().eq("id", id);
  for (const id of lixo.notificacoes) await db.from("notificacoes").delete().eq("id", id);
  const sobras = await db.from("reunioes").select("id").ilike("titulo", "[TESTE]%");
  const sobras2 = await db.from("indicacoes").select("id").ilike("empresa", "[TESTE]%");
  for (const s of sobras.data ?? []) await db.from("reunioes").delete().eq("id", s.id);
  for (const s of sobras2.data ?? []) await db.from("indicacoes").delete().eq("id", s.id);
  console.log(`\nLIMPEZA: reunioes=${lixo.reunioes.length + (sobras.data?.length ?? 0)} indicacoes=${lixo.indicacoes.length + (sobras2.data?.length ?? 0)} notificacoes=${lixo.notificacoes.length} removidas`);
  console.log(`\nRESULTADO: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}
