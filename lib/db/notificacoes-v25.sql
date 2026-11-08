-- ============================================================
-- Arché v25 — Notificações internas persistidas (sem simular push).
-- Idempotentes via dedup_key único. Aditivo e idempotente.
-- ============================================================

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_tipo text not null check (destinatario_tipo in ('admin','parceiro')),
  destinatario_id uuid,              -- null p/ admin (todos os admins); parceiro_id p/ colaborador
  evento text not null,              -- analise_enviada | analise_ajustes | analise_aprovada | tarefa_nova | tarefa_prazo | empresa_dado
  titulo text not null,
  referencia_tipo text,              -- analise | atividade | empresa_dado | cliente
  referencia_id uuid,
  lida boolean not null default false,
  dedup_key text unique,             -- garante 1 aviso por evento de origem
  created_at timestamptz not null default now()
);
alter table public.notificacoes enable row level security;
create index if not exists idx_notif_dest on public.notificacoes (destinatario_tipo, destinatario_id, lida, created_at desc);

select 'notificacoes v25 ok' as status;
