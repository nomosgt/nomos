"use client";

/**
 * Login Arché — interface portada do protótipo oficial (Site Oficial Arché.html),
 * ligada aos fluxos REAIS de autenticação:
 *  - Cliente  → Supabase Auth (email+senha) → /sala
 *  - Equipe   → Supabase Auth (email+senha) → /admin  (middleware valida admin_profiles)
 *  - Parceiro → código de colaborador → POST /api/parceiros/auth → /parceiros
 *
 * Sem credenciais de demonstração e sem 2FA simulado (os do protótipo eram mock).
 * "Acessos salvos" guarda apenas email/nome de exibição (nunca senha nem código).
 */

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";
import { ArrowRight, Loader2, X } from "lucide-react";
import s from "./login-arche.module.css";

export type Perfil = "cliente" | "parceiro" | "equipe";

const LBL: Record<Perfil, { eyebrow: string; t1: string; t2: string; sub: string }> = {
  cliente: { eyebrow: "Cliente", t1: "Sala", t2: "Arché", sub: "Seu caso, em tempo real." },
  parceiro: { eyebrow: "Parceiro", t1: "Central do", t2: "Parceiro", sub: "Demandas, trabalhos e projetos compartilhados." },
  equipe: { eyebrow: "Equipe Arché", t1: "Arché", t2: "Administração", sub: "Painel interno da equipe." },
};

const DEST: Record<Perfil, string> = { cliente: "/sala", parceiro: "/parceiros", equipe: "/admin" };

type Saved = { email: string; name: string; k: Perfil };

function savedList(): Saved[] {
  try {
    const raw = localStorage.getItem("arche_acessos");
    const arr = raw ? (JSON.parse(raw) as Saved[]) : [];
    return Array.isArray(arr) ? arr.filter((x) => x && x.email && x.k) : [];
  } catch {
    return [];
  }
}
function setSavedList(v: Saved[]) {
  try {
    localStorage.setItem("arche_acessos", JSON.stringify(v.slice(0, 6)));
    window.dispatchEvent(new Event("arche_acessos"));
  } catch {
    /* indisponível */
  }
}

/* Store externo (localStorage) — snapshot cacheado p/ referência estável. */
let _savedRaw: string | null = null;
let _savedVal: Saved[] = [];
function savedSnapshot(): Saved[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("arche_acessos");
  } catch {
    raw = null;
  }
  if (raw !== _savedRaw) {
    _savedRaw = raw;
    _savedVal = savedList();
  }
  return _savedVal;
}
const EMPTY_SAVED: Saved[] = [];
function savedSubscribe(cb: () => void) {
  window.addEventListener("arche_acessos", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("arche_acessos", cb);
    window.removeEventListener("storage", cb);
  };
}
function initials(n: string) {
  return n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function LoginArche({ initialRole }: { initialRole: Perfil }) {
  const router = useRouter();
  const search = useSearchParams();
  const erroParam = search.get("erro");

  const [role, setRole] = useState<Perfil>(initialRole);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [loading, setLoading] = useState(false);
  const saved = useSyncExternalStore(savedSubscribe, savedSnapshot, () => EMPTY_SAVED);
  const [error, setError] = useState<string | null>(
    erroParam === "sem_permissao"
      ? initialRole === "equipe"
        ? "Esta conta não tem permissão de admin."
        : "Esta conta não tem acesso a esta área."
      : null,
  );

  const L = LBL[role];
  const next = search.get("next") || DEST[role];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (role === "parceiro") {
        const res = await fetch("/api/parceiros/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error || "Código inválido ou desativado.");
          return;
        }
        router.push("/parceiros");
        router.refresh();
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (signInError) {
        setError("Email ou senha inválidos.");
        return;
      }
      if (lembrar) {
        const nome = email.trim().split("@")[0].replace(/[._-]+/g, " ");
        setSavedList([
          { email: email.trim(), name: nome.charAt(0).toUpperCase() + nome.slice(1), k: role },
          ...savedList().filter((x) => x.email !== email.trim()),
        ]);
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const savedHere = saved.filter((x) => x.k === role);

  return (
    <div className={s.root}>
      <div className={s.left}>
        <div className={s.leftLogo}>
          <Logo variant="full" className="h-12 w-auto text-white" />
        </div>
        <div>
          <div className={s.mono} style={{ opacity: 0.55, marginBottom: 22 }}>
            Sala Arché
          </div>
          <h2>
            Cada etapa, cada documento, <em>cada número.</em>
          </h2>
        </div>
        <div className={`${s.feats} ${s.mono}`}>
          <span>Tempo real</span>
          <span>Aprovações com protocolo</span>
          <span>Acesso individual</span>
        </div>
      </div>

      <div className={s.right}>
        <button type="button" className={s.close} aria-label="Voltar ao site" onClick={() => router.push("/")}>
          <X size={16} strokeWidth={1.8} />
        </button>

        <div className={s.box}>
          <div className={s.mono} style={{ textAlign: "center", opacity: 0.5 }}>
            {L.eyebrow}
          </div>
          <h3>
            {L.t1} <em>{L.t2}</em>
          </h3>
          <p className={s.sub}>{L.sub}</p>

          <div className={s.seg}>
            {(["cliente", "parceiro", "equipe"] as Perfil[]).map((k) => (
              <button
                key={k}
                type="button"
                className={k === role ? "on" : undefined}
                onClick={() => {
                  setRole(k);
                  setError(null);
                }}
              >
                {k === "cliente" ? "Cliente" : k === "parceiro" ? "Parceiro" : "Equipe"}
              </button>
            ))}
          </div>

          {role !== "parceiro" && savedHere.length > 0 && (
            <div className={s.saved}>
              <span className={s.mono}>Acessos salvos neste dispositivo</span>
              <div>
                {savedHere.map((sv) => (
                  <button
                    key={sv.email}
                    type="button"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("[data-remove]")) {
                        setSavedList(saved.filter((x) => x.email !== sv.email));
                        return;
                      }
                      setEmail(sv.email);
                    }}
                  >
                    <span className={s.avatar}>{initials(sv.name)}</span>
                    <span>
                      <b>{sv.name}</b>
                      <small>{sv.email}</small>
                    </span>
                    <i data-remove title="Remover">
                      <X size={12} strokeWidth={2} />
                    </i>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="on">
            {role === "parceiro" ? (
              <>
                <label htmlFor="lgC">Código de colaborador</label>
                <input
                  id="lgC"
                  type="text"
                  required
                  value={codigo}
                  onChange={(e) =>
                    setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10))
                  }
                  placeholder="ARC-XXXXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  style={{ textAlign: "center", letterSpacing: "0.15em", fontSize: 18 }}
                  disabled={loading}
                />
              </>
            ) : (
              <>
                <label htmlFor="lgE">Email</label>
                <input
                  id="lgE"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
                <label htmlFor="lgP">Senha</label>
                <input
                  id="lgP"
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <label className={s.rem}>
                  <input
                    type="checkbox"
                    checked={lembrar}
                    onChange={(e) => setLembrar(e.target.checked)}
                  />
                  Lembrar meu acesso neste dispositivo
                </label>
              </>
            )}

            <div className={s.err}>{error ?? ""}</div>

            <button
              className={s.go}
              type="submit"
              disabled={loading || (role === "parceiro" && codigo.length < 6)}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verificando…
                </>
              ) : (
                <>
                  Entrar <ArrowRight size={16} strokeWidth={1.8} />
                </>
              )}
            </button>
          </form>

          <div className={s.meta}>
            <span>Conexão criptografada</span>
            <span>Acesso individual</span>
            <span>Auditoria de acessos</span>
          </div>

          <div className={s.help}>
            {role === "parceiro" ? (
              <>
                Não possui código? Fale com a equipe Arché:{" "}
                <a href="mailto:contato@archebrasil.com.br">contato@archebrasil.com.br</a>
              </>
            ) : (
              <>
                Ainda não tem acesso?{" "}
                <a href="https://wa.me/5511933333841" target="_blank" rel="noopener noreferrer">
                  Falar com a Arché
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
