import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gerador de Relatórios Arché — serve o sistema completo do Éverton
 * (HTML standalone) com sincronização Supabase injetada. Admin-only.
 * Mesmo padrão do Livro-Caixa (/api/admin/livro-caixa).
 */

async function isAdmin(): Promise<boolean> {
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

const SYNC_SCRIPT = `<script>
/* Arché sync — hidrata do Supabase na 1a carga e faz push automático */
(function () {
  var PREFIX = "arche-relatorios:";
  var FLAG = "rel-hydrated-v1";
  var pushTimer = null;

  function collect() {
    var out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0) out[k] = localStorage.getItem(k);
    }
    return out;
  }

  function setStatus(txt, erro) {
    var el = document.getElementById("arche-sync-status");
    if (el) {
      el.textContent = "\\u2601 " + txt;
      el.style.background = erro ? "#7A2E28" : "#1B2A5C";
    }
  }

  function schedulePush() {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      fetch("/api/admin/relatorios/dados", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dados: collect() }),
      }).then(function (r) {
        if (r.ok) setStatus("salvo na nuvem");
        else setStatus("erro ao salvar na nuvem", true);
      }).catch(function () { setStatus("offline — salvo local", true); });
    }, 1500);
  }

  // intercepta writes do app (rascunho e relatórios salvos)
  var origSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    origSet(k, v);
    if (typeof k === "string" && k.indexOf(PREFIX) === 0) schedulePush();
  };

  // hidratação (1x por sessão): baixa snapshot e recarrega se diferente
  if (!sessionStorage.getItem(FLAG)) {
    sessionStorage.setItem(FLAG, "1");
    fetch("/api/admin/relatorios/dados", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.dados && Object.keys(j.dados).length > 0) {
          var atual = JSON.stringify(collect());
          var remoto = JSON.stringify(j.dados);
          if (atual !== remoto) {
            Object.keys(j.dados).forEach(function (k) { origSet(k, j.dados[k]); });
            location.reload();
          }
        }
      })
      .catch(function () {});
  }

  document.addEventListener("DOMContentLoaded", function () {
    // badge de status
    var b = document.createElement("div");
    b.id = "arche-sync-status";
    b.style.cssText = "position:fixed;bottom:12px;right:16px;z-index:9999;background:#1B2A5C;color:#fff;font:11px/1 monospace;padding:6px 12px;border-radius:3px;opacity:.85";
    b.textContent = "\\u2601 sincronizado";
    document.body.appendChild(b);

    // o app foi feito como artifact do Claude — aqui o salvamento é na nuvem Arché
    function fixSavedMode() {
      var el = document.getElementById("savedMode");
      if (el) el.textContent = "Guardados na nuvem Arché — qualquer admin abre de qualquer computador. Depois de salvo, as alterações são gravadas sozinhas.";
    }
    setTimeout(fixSavedMode, 800);
    var sb = document.getElementById("savedBtn");
    if (sb) sb.addEventListener("click", function () { setTimeout(fixSavedMode, 60); });
  });
})();
</script>`;

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL("/admin/login?next=/admin/relatorios", req.url));
  }
  const file = path.join(process.cwd(), "app", "api", "admin", "relatorios", "template.html");
  let html = await fs.readFile(file, "utf8");
  html = html.replace(/<head>/i, "<head>" + SYNC_SCRIPT);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
