-- ============================================================
-- Arché v12 — Gestão de Atividades (tarefas das advogadas) + alertas
-- Aditivo e idempotente. NÃO apaga nem recria nada existente.
-- Acesso só pelas APIs (admin service-role / parceiro por cookie).
-- ============================================================

-- 1) Atividade: unidade de trabalho com responsável, cliente, caso, prazo, status
create table if not exists public.atividades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  parceiro_id uuid references public.parceiros_codigos(id) on delete set null,  -- responsável (advogada)
  client_id  uuid references public.client_profiles(user_id) on delete set null, -- cliente vinculado
  case_id    uuid references public.client_cases(id) on delete set null,         -- processo/serviço
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta')),
  status     text not null default 'pendente' check (status in ('pendente','em_andamento','concluida')),
  prazo timestamptz,
  concluida_em timestamptz,
  visivel_cliente boolean not null default false,  -- conclusão vira atualização no portal do cliente
  criado_por text not null default 'admin',        -- admin | parceiro
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.atividades enable row level security;
create index if not exists idx_atividades_parceiro on public.atividades (parceiro_id, status);
create index if not exists idx_atividades_cliente on public.atividades (client_id);
create index if not exists idx_atividades_prazo on public.atividades (prazo);

-- 2) Histórico de alterações relevantes
create table if not exists public.atividade_historico (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  evento text not null,
  autor text,
  created_at timestamptz not null default now()
);
alter table public.atividade_historico enable row level security;
create index if not exists idx_ativ_hist on public.atividade_historico (atividade_id, created_at desc);

-- 3) Alertas (atraso / 24h / 48h) — dedup por (atividade, tipo); resolvido ao concluir/reagendar
create table if not exists public.atividade_alertas (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  tipo text not null check (tipo in ('atraso','aviso_48h','aviso_24h')),
  gerado_em timestamptz not null default now(),
  resolvido boolean not null default false,
  resolvido_em timestamptz,
  unique (atividade_id, tipo)
);
alter table public.atividade_alertas enable row level security;
create index if not exists idx_ativ_alertas on public.atividade_alertas (resolvido, tipo);

select 'atividades v12 ok' as status,
  (select count(*) from public.atividades) as atividades;
