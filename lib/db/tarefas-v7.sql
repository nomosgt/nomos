-- ============================================================
-- Arché v7 — Prazos (deadline) e Checklists por colaborador
-- Admin cria/edita; colaborador vê o prazo e marca os itens.
-- Escrita/leitura SOMENTE via APIs (service role). Idempotente.
-- ============================================================

-- 1) Deadline — um prazo ativo por colaborador
create table if not exists public.parceiro_deadlines (
  parceiro_id uuid primary key references public.parceiros_codigos(id) on delete cascade,
  titulo text,
  prazo timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.parceiro_deadlines enable row level security;

-- 2) Checklists
create table if not exists public.parceiro_checklists (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros_codigos(id) on delete cascade,
  titulo text not null,
  criado_em timestamptz not null default now()
);
alter table public.parceiro_checklists enable row level security;
create index if not exists idx_parceiro_checklists_parceiro
  on public.parceiro_checklists (parceiro_id, criado_em desc);

-- 3) Itens do checklist (com anexo opcional do colaborador)
create table if not exists public.parceiro_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.parceiro_checklists(id) on delete cascade,
  ordem int not null default 0,
  texto text not null,
  feito boolean not null default false,
  feito_em timestamptz,
  anexo_path text,
  anexo_nome text
);
alter table public.parceiro_checklist_itens enable row level security;
create index if not exists idx_checklist_itens_checklist
  on public.parceiro_checklist_itens (checklist_id, ordem);

-- verificação
select 'tarefas v7 ok' as status,
  (select count(*) from public.parceiro_deadlines) as deadlines,
  (select count(*) from public.parceiro_checklists) as checklists;
