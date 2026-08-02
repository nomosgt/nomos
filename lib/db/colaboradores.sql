-- ============================================================
-- PORTAL DE PARCEIROS — codigos de acesso
-- Cole este arquivo inteiro no SQL Editor do Supabase e Run.
-- ============================================================

create table if not exists public.parceiros_codigos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  percentual numeric(5,2) not null default 10.00,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultimo_acesso timestamptz
);

-- Sem policies de acesso publico: apenas service_role (API do site) acessa.
alter table public.parceiros_codigos enable row level security;
