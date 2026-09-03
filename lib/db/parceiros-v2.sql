-- =============================================================
-- CENTRAL DO PARCEIRO v2 — sync Supabase (rodar no SQL Editor)
-- =============================================================

-- 1) Hash do cookie de sessão do parceiro (lookup O(1) nas APIs)
alter table public.parceiros_codigos add column if not exists cookie_hash text;
create index if not exists idx_parceiros_cookie_hash
  on public.parceiros_codigos (cookie_hash);

-- 2) Snapshot dos dados do parceiro (clientes, projetos, demandas,
--    comissões, documentos, relatórios) — espelho do que ele vê na Central.
create table if not exists public.parceiro_dados (
  parceiro_id uuid primary key references public.parceiros_codigos(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'parceiro'
    check (updated_by in ('parceiro', 'admin'))
);

-- Sem policies: acesso exclusivamente via service role (API routes).
alter table public.parceiro_dados enable row level security;
