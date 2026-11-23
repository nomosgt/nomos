-- ============================================================
-- ARCHÉ · v26 — Paridade com o protótipo oficial
-- Reuniões · Indicações de parceiros · Horas técnicas · Token antifraude
-- Rode UMA vez no SQL Editor do Supabase. Idempotente (IF NOT EXISTS).
-- Padrão de segurança do projeto: RLS habilitado SEM policies públicas
-- (acesso somente via service role nas rotas do servidor).
-- ============================================================

-- ---------- Reuniões (cliente/parceiro solicitam; admin confirma) ----------
create table if not exists public.reunioes (
  id uuid primary key default gen_random_uuid(),
  solicitante_tipo text not null check (solicitante_tipo in ('cliente','parceiro','admin')),
  client_id uuid references public.client_profiles(user_id) on delete set null,
  parceiro_id uuid references public.parceiros_codigos(id) on delete set null,
  solicitante_nome text,
  titulo text not null,
  detalhes text,
  data_sugerida timestamptz,
  data_confirmada timestamptz,
  status text not null default 'solicitada'
    check (status in ('solicitada','confirmada','concluida','cancelada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists reunioes_status_idx on public.reunioes(status, criado_em desc);
create index if not exists reunioes_client_idx on public.reunioes(client_id);
create index if not exists reunioes_parceiro_idx on public.reunioes(parceiro_id);
alter table public.reunioes enable row level security;

-- ---------- Indicações (parceiro indica empresa; admin trabalha o lead) ----------
create table if not exists public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid references public.parceiros_codigos(id) on delete set null,
  parceiro_nome text,
  empresa text not null,
  contato_nome text,
  contato_email text,
  contato_telefone text,
  observacao text,
  status text not null default 'recebida'
    check (status in ('recebida','em_contato','convertida','descartada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists indicacoes_status_idx on public.indicacoes(status, criado_em desc);
create index if not exists indicacoes_parceiro_idx on public.indicacoes(parceiro_id);
alter table public.indicacoes enable row level security;

-- ---------- Horas técnicas (estimativas que o cliente aprova) ----------
create table if not exists public.horas_estimativas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(user_id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  titulo text not null,
  descricao text,
  horas numeric(8,2) not null check (horas > 0),
  valor numeric(14,2),
  status text not null default 'aguardando_aprovacao'
    check (status in ('solicitada_cliente','aguardando_aprovacao','aprovada','recusada','cancelada')),
  decidido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists horas_client_idx on public.horas_estimativas(client_id, status);
alter table public.horas_estimativas enable row level security;

-- ---------- Token financeiro antifraude (por cliente) ----------
create table if not exists public.client_tokens (
  client_id uuid primary key references public.client_profiles(user_id) on delete cascade,
  token text not null,
  gerado_em timestamptz not null default now(),
  gerado_por text
);
alter table public.client_tokens enable row level security;

select 'v26 aplicada com sucesso' as resultado;
