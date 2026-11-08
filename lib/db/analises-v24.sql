-- ============================================================
-- Arché v24 — Integridade de prazos + eventos de análises +
-- auditoria de dados empresariais. Aditivo e idempotente.
-- Rode depois do v23.
-- ============================================================

-- (1) prazo original imutável: pontualidade "original" vs "vigente"
alter table public.atividades add column if not exists prazo_original timestamptz;
-- preenche o original com o prazo atual nas linhas antigas (não inventa datas:
-- usa o único prazo historicamente conhecido)
update public.atividades set prazo_original = prazo where prazo_original is null and prazo is not null;

-- (2) trilha de eventos das análises técnicas
create table if not exists public.analise_eventos (
  id uuid primary key default gen_random_uuid(),
  analise_id uuid not null references public.analises(id) on delete cascade,
  evento text not null,       -- criada | salva | enviada | em_revisao | ajustes_solicitados | reenviada | aprovada | arquivada | anexo
  detalhe text,
  autor text,
  created_at timestamptz not null default now()
);
alter table public.analise_eventos enable row level security;
create index if not exists idx_analise_eventos on public.analise_eventos (analise_id, created_at desc);

-- (3) auditoria de correções de dados empresariais (valor anterior preservado)
create table if not exists public.empresa_dados_audit (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid references public.empresa_dados(id) on delete set null,
  client_id uuid,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  justificativa text,
  autor_nome text,
  created_at timestamptz not null default now()
);
alter table public.empresa_dados_audit enable row level security;
create index if not exists idx_empresa_dados_audit on public.empresa_dados_audit (registro_id, created_at desc);

select 'analises v24 ok' as status;
