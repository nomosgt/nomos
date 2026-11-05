-- ============================================================
-- Arché v19 — Integridade do livro financeiro:
--  (1) ajuste vinculado a um estágio (estagio_alvo) + justificativa
--  (2) snapshot do título do caso (sobrevive à exclusão do caso)
--  (3) troca ON DELETE CASCADE → SET NULL: registros financeiros NÃO
--      são perdidos se um caso for excluído fisicamente.
-- Aditivo e idempotente. Não migra/destrói dados.
-- ============================================================

-- (1) ajuste passa a indicar qual estágio corrige
alter table public.case_financeiro add column if not exists estagio_alvo text
  check (estagio_alvo in ('potencial','apurado','compensacao','recuperado','honorarios'));

-- (2) snapshot do título do caso para preservar legibilidade do histórico
alter table public.case_financeiro add column if not exists case_titulo text;

-- (3) preservar histórico mesmo se o caso for excluído
alter table public.case_financeiro alter column case_id drop not null;
alter table public.case_financeiro drop constraint if exists case_financeiro_case_id_fkey;
alter table public.case_financeiro
  add constraint case_financeiro_case_id_fkey
  foreign key (case_id) references public.client_cases(id) on delete set null;

select 'financeiro v19 ok' as status;
