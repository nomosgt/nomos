"use client";

/**
 * ArcheShell — shell das áreas restritas, portado do protótipo oficial
 * (Site Oficial Arché.html): sidebar navy com grupos/ícones/badges + barra
 * ativa iris, bloco do usuário com logout, topbar com crumb + indicador
 * "Tempo real" e versão mobile com gaveta.
 *
 * Funciona de dois modos:
 *  - itens com `href`  → navegação por rota (usePathname marca o ativo);
 *  - itens com `onGo`  → navegação por aba (SPA, ex.: Central do Parceiro).
 */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import s from "./arche-shell.module.css";

export type ShellItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: number;
};
export type ShellGroup = { titulo: string; itens: ShellItem[] };

function initials(n: string) {
  return (
    n
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "A"
  );
}

export function ArcheShell({
  area,
  groups,
  userName,
  userSub,
  crumb,
  logoutPath,
  onLogout,
  activeKey,
  onGo,
  children,
}: {
  area: string;
  groups: ShellGroup[];
  userName: string;
  userSub?: string;
  crumb?: string;
  /** POST para esta rota (fluxos Supabase: /admin/sair, /sala/sair) */
  logoutPath?: string;
  /** callback (fluxo por código do parceiro) */
  onLogout?: () => void;
  /** modo SPA: chave ativa + navegação por callback */
  activeKey?: string;
  onGo?: (key: string) => void;
  children: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // match exato p/ raiz da área (/admin, /sala), prefixo p/ subrotas
  function ativo(it: ShellItem): boolean {
    if (activeKey !== undefined) return activeKey === it.key;
    if (!it.href) return false;
    const partes = it.href.split("/").filter(Boolean);
    if (partes.length === 1) return path === it.href; // /admin, /sala, /parceiros
    return path === it.href || path.startsWith(it.href + "/");
  }

  const crumbFinal =
    crumb ??
    (() => {
      for (const g of groups) for (const it of g.itens) if (ativo(it)) return `${area} · ${it.label}`;
      return area;
    })();

  const nav = (
    <>
      <div className={s.sbLogo}>
        <Logo variant="full" className="h-9 w-auto text-white" />
      </div>
      <div className={s.area}>{area}</div>
      <nav>
        {groups.map((g) => (
          <div key={g.titulo}>
            <div className={s.grp}>{g.titulo}</div>
            {g.itens.map((it) => {
              const cls = `${s.navItem} ${ativo(it) ? s.on + " on" : ""}`;
              const inner = (
                <>
                  <it.icon />
                  <span>{it.label}</span>
                  {it.badge ? <span className={s.bd}>{it.badge}</span> : null}
                </>
              );
              return it.href ? (
                <Link key={it.key} href={it.href} className={cls} onClick={() => setOpen(false)}>
                  {inner}
                </Link>
              ) : (
                <button
                  key={it.key}
                  type="button"
                  className={cls}
                  onClick={() => {
                    onGo?.(it.key);
                    setOpen(false);
                  }}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className={s.me}>
        <span className={s.av}>{initials(userName)}</span>
        <span>
          <b>{userName}</b>
          {userSub ? <small>{userSub}</small> : null}
        </span>
        {logoutPath ? (
          <form action={logoutPath} method="POST" style={{ marginLeft: "auto" }}>
            <button type="submit" className={s.meBtn} title="Sair" aria-label="Sair">
              <LogOut />
            </button>
          </form>
        ) : (
          <button type="button" className={s.meBtn} title="Sair" aria-label="Sair" onClick={onLogout}>
            <LogOut />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className={s.app}>
      {/* topo mobile */}
      <div className={s.mTop}>
        <Logo variant="full" className={s.mLogo + " text-white"} />
        <button type="button" className={s.mTopBtn} aria-label="Abrir menu" onClick={() => setOpen(true)}>
          <Menu />
        </button>
      </div>
      <div className={`${s.mScrim} ${open ? s.show : ""}`} onClick={() => setOpen(false)} />

      <aside className={`${s.sb} ${open ? s.open : ""}`}>
        {open && (
          <button
            type="button"
            className={s.mTopBtn}
            style={{ position: "absolute", top: 10, right: 10 }}
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        )}
        {nav}
      </aside>

      <main className={s.mn}>
        <div className={s.tb}>
          <span className={s.crumb}>{crumbFinal}</span>
          <span className={s.sp}>
            <span className={s.live}>
              <i /> Tempo real
            </span>
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
