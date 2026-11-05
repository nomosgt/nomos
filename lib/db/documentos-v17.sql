-- ============================================================
-- Arché v17 — Metadados de documentos (descrição + data de referência)
-- e versionamento leve. Aditivo e idempotente.
-- ============================================================

alter table public.case_documents add column if not exists descricao text;
alter table public.case_documents add column if not exists data_referencia date;
-- versionamento leve: quando um arquivo é substituído, a versão anterior
-- aponta para a nova via substituido_por (o registro antigo vira arquivado).
alter table public.case_documents add column if not exists versao integer not null default 1;
alter table public.case_documents add column if not exists substituido_por uuid references public.case_documents(id) on delete set null;

select 'documentos v17 ok' as status;
