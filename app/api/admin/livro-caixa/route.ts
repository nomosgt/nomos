import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Livro-Caixa Arché — serve o sistema completo do Éverton (HTML standalone)
 * com script de sincronização Supabase injetado. Admin-only.
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
  var PREFIX = "livro-caixa:";
  var FLAG = "lc-hydrated-v1";
  var pushTimer = null;

  function collect() {
    var out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0) out[k] = localStorage.getItem(k);
    }
    return out;
  }

  function schedulePush() {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      fetch("/api/admin/livro-caixa/dados", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dados: collect() }),
      }).then(function () { setStatus("salvo na nuvem"); })
        .catch(function () { setStatus("offline — salvo local"); });
    }, 1500);
  }

  function setStatus(txt) {
    var el = document.getElementById("arche-sync-status");
    if (el) { el.textContent = "\\u2601 " + txt; }
  }

  // intercepta writes do app
  var origSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    origSet(k, v);
    if (typeof k === "string" && k.indexOf(PREFIX) === 0) schedulePush();
  };

  // hidratação (1x por sessão): baixa snapshot e recarrega
  if (!sessionStorage.getItem(FLAG)) {
    sessionStorage.setItem(FLAG, "1");
    fetch("/api/admin/livro-caixa/dados", { cache: "no-store" })
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

  // badge de status no topo
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.createElement("div");
    b.id = "arche-sync-status";
    b.style.cssText = "position:fixed;bottom:12px;right:16px;z-index:9999;background:#1B2A5C;color:#fff;font:11px/1 monospace;padding:6px 12px;border-radius:3px;opacity:.85";
    b.textContent = "\\u2601 sincronizado";
    document.body.appendChild(b);

    // ── Auto-importa colaboradores com login p/ os cadastros do app ──
    function seedColab(ativos, tentativa) {
      try {
        if (
          typeof DB === "undefined" || typeof save !== "function" || typeof uid !== "function" ||
          !Array.isArray(DB.parceiros)
        ) {
          if ((tentativa || 0) < 8) setTimeout(function () { seedColab(ativos, (tentativa || 0) + 1); }, 900);
          return;
        }
        var mudouP = false, mudouC = false;
        ativos.forEach(function (c) {
          var nome = (c.nome || "").trim();
          if (!nome) return;
          var lower = nome.toLowerCase();
          var temP = DB.parceiros.some(function (x) { return (x.nome || "").trim().toLowerCase() === lower; });
          if (!temP) {
            DB.parceiros.push({ id: uid(), nome: nome, contato: c.codigo || "", percentualPadrao: Number(c.percentual) || 0, parcelasPadrao: 1, obs: "Colaborador com login na Central" });
            mudouP = true;
          }
          var temC = (DB.comissionados || []).some(function (x) { return (x.nome || "").trim().toLowerCase() === lower; });
          if (!temC) {
            DB.comissionados.push({ id: uid(), nome: nome, contato: c.codigo || "", percentualPadrao: Number(c.percentual) || 0, parcelasPadrao: 1, obs: "Colaborador com login na Central" });
            mudouC = true;
          }
        });
        if (mudouP) {
          save("parceiros");
          if (typeof popularSelectParceiros === "function") popularSelectParceiros();
          if (typeof renderParceiros === "function") renderParceiros();
        }
        if (mudouC) {
          save("comissionados");
          if (typeof renderComissionados === "function") renderComissionados();
          if (typeof renderListaComissionamentos === "function") renderListaComissionamentos();
        }
      } catch (e) {}
    }

    // ── Trava Arché: parceiros e comissionados SÓ com login de colaborador ──
    fetch("/api/admin/colaboradores", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var lista = (j && (j.colaboradores || j.data || j)) || [];
        if (!Array.isArray(lista)) return;
        var ativos = lista.filter(function (c) {
          return c && c.ativo !== false && c.papel !== "supervisor" && c.nome;
        });
        setTimeout(function () { seedColab(ativos, 0); }, 1200);
        ["form-parceiro", "form-comissionado"].forEach(function (fid) {
          var form = document.getElementById(fid);
          if (!form) return;
          var inp = form.querySelector('input[name="nome"]');
          if (!inp) return;
          var sel = document.createElement("select");
          sel.name = "nome";
          sel.required = true;
          sel.style.cssText = inp.style.cssText;
          sel.className = inp.className;
          var ph = document.createElement("option");
          ph.value = ""; ph.textContent = "Selecione o colaborador com login\\u2026";
          sel.appendChild(ph);
          ativos.forEach(function (c) {
            var o = document.createElement("option");
            o.value = c.nome;
            o.textContent = c.nome + (c.codigo ? " (" + c.codigo + ")" : "");
            o.setAttribute("data-pct", c.percentual != null ? c.percentual : "");
            sel.appendChild(o);
          });
          // auto-preenche o % padrao do login ao selecionar
          sel.addEventListener("change", function () {
            var opt = sel.options[sel.selectedIndex];
            var pct = opt ? opt.getAttribute("data-pct") : "";
            var pctInput = form.querySelector('input[name="percentualPadrao"]');
            if (pctInput && pct) pctInput.value = pct;
          });
          inp.parentNode.replaceChild(sel, inp);
          var hint = document.createElement("div");
          hint.style.cssText = "font-size:10px;color:#8B8E94;margin-top:3px";
          hint.textContent = "Somente colaboradores com login na Central podem ser cadastrados.";
          sel.parentNode.appendChild(hint);
        });
      })
      .catch(function () {});
  });
})();
</script>`;

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL("/admin/login?next=/admin/financeiro", req.url));
  }
  const file = path.join(process.cwd(), "app", "api", "admin", "livro-caixa", "template.html");
  let html = await fs.readFile(file, "utf8");
  html = html.replace(/<head>/i, "<head>" + SYNC_SCRIPT);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
