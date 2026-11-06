-- ============================================================================
-- ARCHÉ — SEED DE HOMOLOGAÇÃO (dados 100% fictícios)
-- Rode DEPOIS do 01-setup-homologacao.sql, no projeto de HOMOLOGAÇÃO.
--
-- PRÉ-REQUISITO (feito por você no Dashboard → Authentication → Add user):
--   1) Usuário ADMIN de homologação   (e-mail fictício seu, ex. admin@homolog.local)
--   2) Usuário CLIENTE de homologação (e-mail fictício seu, ex. cliente@homolog.local)
-- Copie o UUID de cada um e substitua os placeholders abaixo ANTES de rodar.
-- ============================================================================

-- >>> SUBSTITUA: UUID do usuário ADMIN criado no Auth
--     e UUID do usuário CLIENTE criado no Auth
-- (busque por <<ADMIN_UUID>> e <<CLIENTE_UUID>> — 2 ocorrências cada)

-- 1) Perfil de administrador
insert into public.admin_profiles (user_id, nome, role)
values ('<<ADMIN_UUID>>', 'Admin Homologação', 'superadmin')
on conflict (user_id) do nothing;

-- 2) Perfil do cliente fictício
insert into public.client_profiles (user_id, nome, empresa, cargo, telefone, status, caixa_recuperado_total)
values ('<<CLIENTE_UUID>>', 'Cliente Homologação', 'Empresa Fictícia de Testes LTDA', 'Diretor', '(00) 00000-0000', 'ativo', 0)
on conflict (user_id) do nothing;

-- 3) Um caso fictício para os testes de etapa/financeiro/documentos/aprovações
insert into public.client_cases (client_id, titulo, tese, descricao, etapa, status, potencial_estimado)
select '<<CLIENTE_UUID>>', '[HOMOLOG] Caso de Teste', 'Tese fictícia de homologação', 'Caso criado exclusivamente para homologação. Sem dados reais.', 1, 'em_andamento', 100000
where not exists (
  select 1 from public.client_cases where client_id = '<<CLIENTE_UUID>>' and titulo = '[HOMOLOG] Caso de Teste'
);

select 'seed homologacao ok' as status,
  (select count(*) from public.admin_profiles)  as admins,
  (select count(*) from public.client_profiles) as clientes,
  (select count(*) from public.client_cases)    as casos;
