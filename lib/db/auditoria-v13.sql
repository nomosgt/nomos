-- ============================================================
-- Arché v13 — Arquivamento de documentos (soft-delete) + trilha de
-- auditoria + guarda anti-duplicação no portal. Aditivo e idempotente.
-- Rode depois do v12.
-- ============================================================

-- 1) Atividade publica no portal do cliente NO MÁXIMO uma vez
alter table public.atividades add column if not exists publicado_portal boolean not null default false;

-- 2) Documentos do caso: arquivamento lógico (preserva o arquivo e o histórico)
alter table public.case_documents add column if not exists arquivado boolean not null default false;
alter table public.case_documents add column if not exists arquivado_em timestamptz;
create index if not exists idx_case_documents_arquivado on public.case_documents (case_id, arquivado);

-- 3) Trilha de auditoria de documentos (sem FK: sobrevive à exclusão física)
create table if not exists public.case_document_audit (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid,
  case_id uuid,
  nome text,
  evento text not null,          -- criado | renomeado | visibilidade | arquivado | restaurado | excluido
  detalhe text,
  autor uuid,                    -- admin que realizou a ação
  created_at timestamptz not null default now()
);
alter table public.case_document_audit enable row level security;
create index if not exists idx_doc_audit_doc on public.case_document_audit (documento_id, created_at desc);
create index if not exists idx_doc_audit_case on public.case_document_audit (case_id, created_at desc);

select 'auditoria v13 ok' as status;
