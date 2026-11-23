-- ============================================================
-- ARCHÉ · v27 — Deadline dos projetos (tela do protótipo)
-- Datas por etapa · Pendências documentais · Visibilidade no portal
-- Rode UMA vez no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- Data de cada etapa do caso: concluída (passado) ou prevista (futuro).
create table if not exists public.case_etapa_datas (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  etapa int not null check (etapa between 1 and 7),
  data date not null,
  unique (case_id, etapa)
);
create index if not exists case_etapa_datas_case_idx on public.case_etapa_datas(case_id);
alter table public.case_etapa_datas enable row level security;

-- Pendências documentais do caso (bloqueiam avanço de etapa).
create table if not exists public.case_checklist (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  titulo text not null,
  concluido boolean not null default false,
  concluido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists case_checklist_case_idx on public.case_checklist(case_id, concluido);
alter table public.case_checklist enable row level security;

-- Visibilidade do caso no portal do cliente (default: visível).
alter table public.client_cases
  add column if not exists visivel_cliente boolean not null default true;

select 'v27 aplicada com sucesso' as resultado;
