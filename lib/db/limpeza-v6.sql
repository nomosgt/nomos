-- ============================================================
-- Arché v6 — LIMPEZA DE DADOS FICTÍCIOS + supervisão só no admin
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

-- 1) Supervisão é exclusiva do admin: todo colaborador vira papel comum.
update public.parceiros_codigos set papel = 'parceiro' where papel = 'supervisor';

-- 2) Aprovações de demonstração
delete from public.client_aprovacoes where titulo like '[DEMO]%';

-- 3) Arquivos do cliente de teste no bucket case-documents
with casos_teste as (
  select c.id::text as cid
  from public.client_cases c
  join public.client_profiles p on p.user_id = c.client_id
  where p.nome = 'Cliente Teste NGT' or p.empresa = 'Cliente Teste NGT'
)
delete from storage.objects
where bucket_id = 'case-documents'
  and (string_to_array(name, '/'))[1] in (select cid from casos_teste);

-- 4) Cliente de teste (auth.users cascateia client_profiles → cases → docs → aprovações)
delete from auth.users where email = 'testecliente@nomos.com.br';
delete from public.client_profiles where nome = 'Cliente Teste NGT' or empresa = 'Cliente Teste NGT';

-- 5) Arquivo órfão de QA no bucket parceiros
delete from storage.objects where bucket_id = 'parceiros' and name like '%teste-qa.txt';

-- 6) Snapshots da Central com a empresa fictícia do seed antigo
--    ("Exemplo Industria Ltda") voltam ao estado vazio.
update public.parceiro_dados
set dados = '{"clientes":[],"projetos":[],"trabalhos":[],"comissoes":[],"documentos":[],"relatorios":[],"diario":[]}'::jsonb,
    updated_at = now(),
    updated_by = 'admin'
where dados::text like '%Exemplo Industria Ltda%';

-- 7) Verificação
select
  (select count(*) from public.parceiros_codigos where papel = 'supervisor') as supervisores_restantes,
  (select count(*) from public.client_aprovacoes where titulo like '[DEMO]%') as aprovacoes_demo,
  (select count(*) from public.client_profiles where nome = 'Cliente Teste NGT') as clientes_teste,
  (select count(*) from storage.objects where bucket_id = 'parceiros' and name like '%teste-qa.txt') as arquivos_qa,
  (select count(*) from public.parceiro_dados where dados::text like '%Exemplo Industria Ltda%') as snapshots_com_seed;
-- esperado: tudo 0
