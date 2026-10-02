-- ============================================================
-- Arché v5 — Gerador de Relatórios (sistema do Éverton no admin)
-- Persistência do snapshot do app (rascunho + relatórios salvos).
-- Escrita/leitura SOMENTE via API admin com service role.
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- ============================================================

create table if not exists public.relatorios_dados (
  id int primary key default 1 check (id = 1),
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.relatorios_dados enable row level security;
-- (sem policies de proposito: acesso apenas pela service role)

-- verificação
select 'relatorios_dados ok' as status, count(*) as linhas from public.relatorios_dados;
