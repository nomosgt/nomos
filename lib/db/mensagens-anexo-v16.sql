-- ============================================================
-- Arché v16 — Anexo em mensagens do chat cliente ↔ equipe.
-- Reusa o bucket case-documents. Aditivo e idempotente.
-- ============================================================

alter table public.case_messages add column if not exists anexo_path text;
alter table public.case_messages add column if not exists anexo_nome text;
alter table public.case_messages add column if not exists anexo_mime text;

select 'mensagens anexo v16 ok' as status;
