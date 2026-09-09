-- =============================================================
-- FINANCEIRO v3 — Livro-Caixa + Folha do Parceiro + Supervisão
-- (rodar no SQL Editor do Supabase)
-- =============================================================

-- 1) Papel do colaborador: parceiro comum ou supervisor(a)
--    Supervisor vê todos os processos/colaboradores, NUNCA financeiro.
alter table public.parceiros_codigos
  add column if not exists papel text not null default 'parceiro'
  check (papel in ('parceiro', 'supervisor'));

-- 2) Folha oficial do parceiro — SÓ o admin escreve; o parceiro lê o próprio.
create table if not exists public.parceiro_financeiro (
  parceiro_id uuid primary key references public.parceiros_codigos(id) on delete cascade,
  percentual numeric not null default 0,        -- % de retenção/comissão do parceiro
  pendente numeric not null default 0,          -- total pendente de repasse
  proximo_pagamento date,                       -- quando cai o próximo pagamento
  proximo_valor numeric,                        -- valor do próximo pagamento
  historico jsonb not null default '[]'::jsonb, -- [{data, valor, descricao, status}]
  observacoes text,
  updated_at timestamptz not null default now()
);
alter table public.parceiro_financeiro enable row level security;

-- 3) Persistência do Livro-Caixa do admin (snapshot do app)
create table if not exists public.livro_caixa_dados (
  id int primary key default 1 check (id = 1),
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.livro_caixa_dados enable row level security;
