-- ============================================================
-- Arché v18 — Livro de lançamentos financeiros por caso.
-- Cada valor financeiro é um LANÇAMENTO rastreável (não um total
-- editável solto). Os estágios são distintos e não se somam entre si.
-- Aditivo e idempotente.
-- ============================================================

create table if not exists public.case_financeiro (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  client_id uuid references public.client_profiles(user_id) on delete set null,  -- isolamento/consulta
  tipo text not null check (tipo in ('potencial','apurado','compensacao','recuperado','honorarios','ajuste')),
  valor numeric(14,2) not null,                 -- dinheiro: numeric, nunca float
  data_referencia date,
  descricao text,
  justificativa text,                           -- obrigatória para ajustes (validado na API)
  autor uuid,                                   -- admin responsável
  autor_nome text,
  created_at timestamptz not null default now()
);

alter table public.case_financeiro enable row level security;
-- sem policy pública: só service-role (admin). O cliente NÃO lê o livro bruto;
-- a Sala continua lendo os valores consolidados do caso/perfil.
create index if not exists idx_case_financeiro_case on public.case_financeiro (case_id, tipo, created_at desc);
create index if not exists idx_case_financeiro_client on public.case_financeiro (client_id, created_at desc);

select 'financeiro v18 ok' as status;
