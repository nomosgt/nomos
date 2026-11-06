-- ============================================================
-- Arché v22 — Campos de caso (responsável, período de apuração) +
-- trilha de auditoria de casos (edições administrativas).
-- Registra campo a campo (de/para), autor e data. Aditivo e idempotente.
-- ============================================================

alter table public.client_cases add column if not exists responsavel text;
alter table public.client_cases add column if not exists periodo_apuracao text;

create table if not exists public.case_audit (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.client_cases(id) on delete set null,
  client_id uuid references public.client_profiles(user_id) on delete set null,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  autor uuid,
  autor_nome text,
  created_at timestamptz not null default now()
);
alter table public.case_audit enable row level security;
create index if not exists idx_case_audit on public.case_audit (case_id, created_at desc);

select 'casos v22 ok' as status;
