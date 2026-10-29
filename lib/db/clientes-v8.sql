-- ============================================================
-- Arché v8 — Atribuição de clientes a colaboradores
-- Admin marca quais clientes da Sala cada colaborador cuida.
-- Acesso só pelas APIs (service role). Idempotente.
-- ============================================================

create table if not exists public.parceiro_clientes (
  parceiro_id uuid not null references public.parceiros_codigos(id) on delete cascade,
  client_id uuid not null references public.client_profiles(user_id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (parceiro_id, client_id)
);
alter table public.parceiro_clientes enable row level security;
create index if not exists idx_parceiro_clientes_cliente
  on public.parceiro_clientes (client_id);

select 'clientes v8 ok' as status;
