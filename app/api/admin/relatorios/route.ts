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

  /* ── Publicar na Sala: captura o PDF gerado e oferece envio ao cliente ── */
  var ultimoPdf = null; // { blob, nome }
  var origCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    try {
      if (obj instanceof Blob && obj.type === "application/pdf") {
        ultimoPdf = { blob: obj, nome: "Relatorio_Arche.pdf" };
      }
    } catch (e) {}
    return origCreate(obj);
  };

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
    if (!a || !ultimoPdf) return;
    if (a.download) ultimoPdf.nome = a.download;
    setTimeout(mostrarPainel, 600);
  }, true);

  var painel = null, dadosSala = null;

  function criarPainel() {
    painel = document.createElement("div");
    painel.id = "arche-pub-sala";
    painel.style.cssText = "position:fixed;bottom:46px;right:16px;z-index:9999;width:300px;background:#fff;color:#161A22;border:1px solid #DBDCDE;border-top:3px solid #1B2A5C;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:14px;font:13px/1.45 'IBM Plex Sans',system-ui,sans-serif;border-radius:3px";
    painel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<strong style="font-size:13px">Publicar na Sala do cliente</strong>' +
        '<button id="pubFechar" style="border:none;background:none;cursor:pointer;font-size:15px;color:#8E9095">\\u00d7</button>' +
      '</div>' +
      '<div style="font-size:11.5px;color:#5B5F66;margin-bottom:10px">O PDF que voc\\u00ea acabou de gerar pode ir direto para a aba Documentos do cliente.</div>' +
      '<select id="pubCliente" style="width:100%;margin-bottom:8px;padding:7px;border:1px solid #DBDCDE;border-radius:3px;font-size:12.5px"><option value="">Carregando clientes\\u2026</option></select>' +
      '<select id="pubCaso" style="width:100%;margin-bottom:10px;padding:7px;border:1px solid #DBDCDE;border-radius:3px;font-size:12.5px"><option value="">Selecione o cliente primeiro</option></select>' +
      '<button id="pubEnviar" disabled style="width:100%;padding:9px;background:#1B2A5C;color:#fff;border:none;border-radius:3px;font-size:13px;cursor:pointer;opacity:.5">Publicar PDF</button>' +
      '<div id="pubMsg" style="font-size:11.5px;color:#5B5F66;margin-top:7px;min-height:15px"></div>';
    document.body.appendChild(painel);

    document.getElementById("pubFechar").addEventListener("click", function () { painel.style.display = "none"; });

    var selC = document.getElementById("pubCliente");
    var selK = document.getElementById("pubCaso");
    var btn = document.getElementById("pubEnviar");
    var msg = document.getElementById("pubMsg");

    function habilitar() {
      var ok = selC.value && selK.value && ultimoPdf;
      btn.disabled = !ok;
      btn.style.opacity = ok ? "1" : ".5";
    }

    selC.addEventListener("change", function () {
      selK.innerHTML = "";
      var cli = (dadosSala || []).filter(function (c) { return c.user_id === selC.value; })[0];
      var casos = cli ? cli.casos : [];
      if (!casos.length) {
        selK.innerHTML = '<option value="">Este cliente n\\u00e3o tem caso \\u2014 crie no painel Clientes</option>';
      } else {
        selK.innerHTML = '<option value="">Escolha o caso\\u2026</option>' + casos.map(function (k) {
          return '<option value="' + k.id + '">' + String(k.titulo).replace(/</g, "&lt;") + '</option>';
        }).join("");
      }
      habilitar();
    });
    selK.addEventListener("change", habilitar);

    btn.addEventListener("click", function () {
      if (!ultimoPdf || !selK.value) return;
      btn.disabled = true;
      btn.textContent = "Publicando\\u2026";
      msg.textContent = "";
      var fd = new FormData();
      fd.append("file", new File([ultimoPdf.blob], ultimoPdf.nome, { type: "application/pdf" }));
      fd.append("case_id", selK.value);
      fd.append("categoria", "relatorio");
      fd.append("visibilidade", "cliente");
      fetch("/api/admin/clientes/documentos", { method: "POST", body: fd })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) {
            msg.style.color = "#3E7A52";
            msg.textContent = "\\u2713 Publicado \\u2014 o cliente j\\u00e1 v\\u00ea na Sala, aba Documentos.";
            btn.textContent = "Publicar outro";
          } else {
            msg.style.color = "#B4392F";
            msg.textContent = (res.j && res.j.error) || "Falha ao publicar.";
            btn.textContent = "Publicar PDF";
          }
        })
        .catch(function () {
          msg.style.color = "#B4392F";
          msg.textContent = "Erro de conex\\u00e3o.";
          btn.textContent = "Publicar PDF";
        })
        .finally(function () { btn.disabled = false; });
    });
  }

  function mostrarPainel() {
    if (!painel) criarPainel();
    painel.style.display = "block";
    var selC = document.getElementById("pubCliente");
    if (dadosSala) return;
    fetch("/api/admin/clientes/documentos", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        dadosSala = (j && j.clientes) || [];
        if (!dadosSala.length) {
          selC.innerHTML = '<option value="">Nenhum cliente ativo na Sala</option>';
          return;
        }
        selC.innerHTML = '<option value="">Escolha o cliente\\u2026</option>' + dadosSala.map(function (c) {
          var rot = c.nome + (c.empresa ? " \\u2014 " + c.empresa : "");
          return '<option value="' + c.user_id + '">' + String(rot).replace(/</g, "&lt;") + '</option>';
        }).join("");
      })
      .catch(function () {
        selC.innerHTML = '<option value="">Erro ao carregar clientes</option>';
      });
  }
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
