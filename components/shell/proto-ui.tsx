/**
 * Kit de UI do protótipo (ph-h, kc, cd, b) — usado pelas páginas das áreas
 * restritas para manter o visual idêntico ao HTML oficial.
 */

import type { ReactNode } from "react";

/** Cabeçalho de página (.ph-h): eyebrow mono + h1 serif com itálico iris. */
export function PageHeader({
  eyebrow,
  title,
  em,
  sub,
  actions,
}: {
  eyebrow: string;
  title: string;
  em?: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
      <div>
        <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#7a7c95]">{eyebrow}</div>
        <h1 className="font-serif text-[clamp(32px,3vw,44px)] font-normal leading-[1.05] tracking-[-0.01em] text-[#0f1240]">
          {title} {em && <em className="italic text-[#3a40c9]">{em}</em>}
        </h1>
        {sub && <p className="mt-2 text-[13.5px] text-[#6b6e88]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Card KPI (.kc) — `dark` replica o primeiro card navy do protótipo. */
export function Kc({
  label,
  value,
  sub,
  dark,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  dark?: boolean;
  tone?: "ok" | "warn";
}) {
  return (
    <div
      className={`relative min-h-[112px] rounded-[10px] border px-5 py-[18px] ${
        dark ? "border-[#0f1240] bg-[#0f1240] text-white" : "border-[#e9e6df] bg-white"
      }`}
    >
      <div className={`font-mono text-[9.5px] uppercase tracking-[0.18em] ${dark ? "text-white/60" : "text-[#7a7c95]"}`}>
        {label}
      </div>
      <div className={`mb-1 mt-2.5 whitespace-nowrap font-serif text-[30px] font-normal tracking-[-0.01em] ${dark ? "text-white" : "text-[#0f1240]"}`}>
        {value}
      </div>
      {sub && (
        <div className={`text-[11.5px] ${dark ? "text-white/60" : tone === "warn" ? "text-[#c97e12]" : tone === "ok" ? "text-[#1d8a5a]" : "text-[#7a7c95]"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

/** Card de conteúdo (.cd) com cabeçalho. */
export function Cd({
  title,
  mono,
  children,
  className,
}: {
  title: string;
  mono?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-[10px] border border-[#e9e6df] bg-white ${className || ""}`}>
      <div className="flex items-center justify-between gap-2.5 border-b border-[#efece6] px-5 py-4">
        <h3 className="font-serif text-[21px] font-normal text-[#0f1240]">{title}</h3>
        {mono && <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[#8a8ca3]">{mono}</span>}
      </div>
      <div className="px-5 py-[18px]">{children}</div>
    </div>
  );
}

/** Botão primário/contorno do protótipo (.b.p / .b.o). */
export function BtnP({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] bg-[#0f1240] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#3a40c9] disabled:pointer-events-none disabled:opacity-45 ${rest.className || ""}`}
    >
      {children}
    </button>
  );
}

export function BtnO({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-[#dedbd3] bg-white px-4 text-[13px] font-semibold text-[#14173d] transition-colors hover:border-[#0f1240] disabled:pointer-events-none disabled:opacity-45 ${rest.className || ""}`}
    >
      {children}
    </button>
  );
}

/** Tag de status neutra. */
export function StTag({ children, tone }: { children: ReactNode; tone?: "ok" | "warn" | "bad" | "info" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : tone === "bad"
          ? "bg-rose-50 text-rose-800 border-rose-200"
          : "bg-[#f4f2ee] text-[#6b6e88] border-[#e9e6df]";
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${cls}`}>{children}</span>;
}

/** Barra de progresso fina (carteira por etapa). */
export function Barra({ pct }: { pct: number }) {
  return (
    <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#ebe8e1]">
      <div className="h-full rounded-full bg-[#0f1240]" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function fmtData(iso: string | null | undefined, hora = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(hora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Saudação por horário de Brasília, como no protótipo. */
export function saudacao(): string {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()),
  );
  if (h < 6) return "Boa noite";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function dataLonga(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date())
    .toUpperCase();
}
