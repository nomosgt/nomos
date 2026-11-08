-- ============================================================
-- Arché v23 — Central de Comando do Super Admin:
--  (1) novos estados de atividade: aguardando_revisao, cancelada
--  (2) análises técnicas dos colaboradores (com versões e revisão)
--  (3) dados empresariais (faturamento etc.) — SEPARADOS do livro
--      de recuperação tributária (case_financeiro), como exigido.
-- Aditivo e idempotente.
-- ============================================================

-- (1) estados ampliados
alter table public.atividades drop constraint if exists atividades_status_check;
alter table public.atividades add constraint atividades_status_check
  check (status in ('pendente','em_andamento','aguardando_revisao','concluida','cancelada'));

-- (2) análises técnicas
create table if not exists public.analises (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid references public.parceiros_codigos(id) on delete set null,
  parceiro_nome text,
  client_id uuid references public.client_profiles(user_id) on delete set null,
  case_id uuid references public.client_cases(id) on delete set null,
  atividade_id uuid references public.atividades(id) on delete set null,  -- vínculo com a tarefa de origem
  titulo text not null,
  periodo_analisado text,
  objetivo text,
  dados_utilizados text,
  diagnostico text,
  oportunidades text,
  riscos text,
  recomendacoes text,
  conclusao text,
  status text not null default 'rascunho'
    check (status in ('rascunho','enviada','em_revisao','ajustes_solicitados','aprovada','arquivada')),
  comentario_revisao text,          -- comentário do admin ao solicitar ajustes
  versao integer not null default 1,
  versao_anterior uuid references public.analises(id) on delete set null,  -- encadeia versões
  enviada_em timestamptz,
  revisada_em timestamptz,
  revisada_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.analises enable row level security;
create index if not exists idx_analises_parceiro on public.analises (parceiro_id, created_at desc);
create index if not exists idx_analises_client on public.analises (client_id, created_at desc);
create index if not exists idx_analises_status on public.analises (status);

-- anexos da análise reutilizam o bucket case-documents via vínculo rastreável
create table if not exists public.analise_anexos (
  id uuid primary key default gen_random_uuid(),
  analise_id uuid not null references public.analises(id) on delete cascade,
  nome text not null,
  storage_path text not null,
  tipo_mime text,
  tamanho_bytes bigint,
  uploader_nome text,
  created_at timestamptz not null default now()
);
alter table public.analise_anexos enable row level security;
create index if not exists idx_analise_anexos on public.analise_anexos (analise_id);

-- (3) dados empresariais (NÃO confundir com case_financeiro/recuperação)
create table if not exists public.empresa_dados (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(user_id) on delete cascade,
  tipo text not null check (tipo in (
    'faturamento_mensal','faturamento_anual','receita_bruta','receita_liquida',
    'despesas_operacionais','custos','lucro','outro'
  )),
  periodo text not null,            -- ex.: "2026-01", "2025", "jan-jun/2026"
  valor numeric(16,2) not null,
  moeda text not null default 'BRL',
  origem text not null default 'declarado'
    check (origem in ('declarado','importado','calculado','validado')),
  validado boolean not null default false,
  observacao text,
  documento_id uuid references public.case_documents(id) on delete set null, -- comprovante
  autor_tipo text not null default 'admin' check (autor_tipo in ('admin','parceiro')),
  autor_nome text,
  created_at timestamptz not null default now()
);
alter table public.empresa_dados enable row level security;
create index if not exists idx_empresa_dados on public.empresa_dados (client_id, tipo, periodo);

-- setor/regime no cadastro (identificação empresarial)
alter table public.client_profiles add column if not exists setor text;
alter table public.client_profiles add column if not exists regime_tributario text;
alter table public.client_profiles add column if not exists porte text;

select 'central v23 ok' as status;
