-- ============================================================
-- Arché v20 — Dados cadastrais do cliente + trilha de auditoria.
-- Aditivo e idempotente. NÃO altera identidade de autenticação.
-- ============================================================

alter table public.client_profiles add column if not exists nome_fantasia text;
alter table public.client_profiles add column if not exists consultor text;       -- consultor designado
alter table public.client_profiles add column if not exists observacoes text;      -- observações administrativas internas

-- trilha de auditoria cadastral (campo a campo)
create table if not exists public.client_profile_audit (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.client_profiles(user_id) on delete set null,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  autor uuid,
  autor_nome text,
  created_at timestamptz not null default now()
);
alter table public.client_profile_audit enable row level security;
create index if not exists idx_client_profile_audit on public.client_profile_audit (client_id, created_at desc);

select 'cadastro v20 ok' as status;
