-- ============================================================
-- Arché v15 — Aprovações ricas: campos estruturados, protocolo,
-- termos aceitos, fluxo de ajuste e trilha de eventos.
-- Aditivo e idempotente. Rode depois do v4.
-- ============================================================

-- 1) Campos estruturados da autorização (todos opcionais)
alter table public.client_aprovacoes add column if not exists valor_credito numeric(14,2);
alter table public.client_aprovacoes add column if not exists tributos text;
alter table public.client_aprovacoes add column if not exists periodo_apuracao text;
alter table public.client_aprovacoes add column if not exists modalidade text;
alter table public.client_aprovacoes add column if not exists inicio_previsto text;
alter table public.client_aprovacoes add column if not exists impacto_caixa text;
alter table public.client_aprovacoes add column if not exists fundamentacao text;
alter table public.client_aprovacoes add column if not exists risco text;          -- baixo | medio | alto (texto livre)
alter table public.client_aprovacoes add column if not exists honorarios text;
alter table public.client_aprovacoes add column if not exists prazo_decisao timestamptz;

-- 2) Decisão: protocolo único + termos aceitos + quem decidiu
alter table public.client_aprovacoes add column if not exists protocolo text;
alter table public.client_aprovacoes add column if not exists termos_versao text;
alter table public.client_aprovacoes add column if not exists termos_aceitos_em timestamptz;
alter table public.client_aprovacoes add column if not exists decidido_por_nome text;
-- protocolo único quando presente
create unique index if not exists uq_aprovacoes_protocolo on public.client_aprovacoes (protocolo) where protocolo is not null;

-- 3) Fluxo de ajuste
alter table public.client_aprovacoes add column if not exists ajuste_motivo text;
alter table public.client_aprovacoes add column if not exists ajuste_obs text;
alter table public.client_aprovacoes add column if not exists ajuste_solicitado_em timestamptz;
alter table public.client_aprovacoes add column if not exists revisao integer not null default 0;

-- 4) Novo status permitido: ajuste_solicitado
alter table public.client_aprovacoes drop constraint if exists client_aprovacoes_status_check;
alter table public.client_aprovacoes add constraint client_aprovacoes_status_check
  check (status in ('pendente', 'aprovada', 'recusada', 'ajuste_solicitado'));

-- 5) Anexos da aprovação (reusa case_documents; vínculo rastreável)
alter table public.case_documents add column if not exists aprovacao_id uuid references public.client_aprovacoes(id) on delete set null;
create index if not exists idx_case_documents_aprovacao on public.case_documents (aprovacao_id);

-- 6) Trilha de eventos da aprovação (auditoria)
create table if not exists public.aprovacao_eventos (
  id uuid primary key default gen_random_uuid(),
  aprovacao_id uuid not null references public.client_aprovacoes(id) on delete cascade,
  evento text not null,          -- criada | decidida | ajuste_solicitado | reapresentada
  detalhe text,
  autor text,
  created_at timestamptz not null default now()
);
alter table public.aprovacao_eventos enable row level security;
create index if not exists idx_aprovacao_eventos on public.aprovacao_eventos (aprovacao_id, created_at desc);

select 'aprovacoes v15 ok' as status;
