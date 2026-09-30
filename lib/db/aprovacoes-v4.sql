-- =============================================================
-- v4 — Aprovações do Cliente + bucket de documentos de caso
-- (rodar no SQL Editor do Supabase)
-- =============================================================

-- 1) Bucket privado dos documentos de caso (a Sala já esperava por ele)
insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false)
on conflict (id) do nothing;

-- 2) Aprovações: admin/colaborador pergunta → cliente aprova ou recusa
create table if not exists public.client_aprovacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.client_profiles(user_id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  origem text not null default 'admin' check (origem in ('admin', 'parceiro')),
  origem_nome text,
  parceiro_id uuid references public.parceiros_codigos(id) on delete set null,
  titulo text not null,
  corpo text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovada', 'recusada')),
  resposta text,
  respondido_em timestamptz
);

create index if not exists idx_aprovacoes_client
  on public.client_aprovacoes (client_id, created_at desc);
create index if not exists idx_aprovacoes_parceiro
  on public.client_aprovacoes (parceiro_id, created_at desc);

alter table public.client_aprovacoes enable row level security;

-- Cliente lê as próprias; admin lê tudo. Escritas só via API (service role).
drop policy if exists "cliente le aprovacoes" on public.client_aprovacoes;
create policy "cliente le aprovacoes"
  on public.client_aprovacoes for select
  to authenticated
  using (public.is_admin() or client_id = auth.uid());
