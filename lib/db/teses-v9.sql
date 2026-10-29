-- ============================================================
-- Arché v9 — Central de Inteligência de Teses (acervo próprio)
-- Base ORIGINAL da casa. Conhecimento tributário público, descrições
-- autorais. Acesso só pelas APIs admin (service role). Idempotente.
-- ============================================================

create table if not exists public.teses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  tributos text[] not null default '{}',
  resumo text not null,
  fundamento text,
  precedente text,                       -- ex.: "Tema 69 STF · RE 574.706"
  esfera text not null default 'ambas'   -- judicial | administrativa | ambas
    check (esfera in ('judicial','administrativa','ambas')),
  status_jur text not null default 'oportunidade'
    check (status_jur in ('tese_firmada','consolidada','em_discussao','modulada','oportunidade')),
  setores text[] not null default '{}',
  regimes text[] not null default '{}',  -- lucro_real | lucro_presumido | simples
  risco text not null default 'medio'
    check (risco in ('baixo','medio','alto')),
  retroatividade text,                   -- ex.: "5 anos"
  potencial text,
  tags text[] not null default '{}',
  fonte_url text,
  observacoes text,
  destaque boolean not null default false,
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.teses enable row level security;
create index if not exists idx_teses_updated on public.teses (updated_at desc);

-- ---- Seed: teses tributárias públicas e notórias (descrições autorais) ----
insert into public.teses (slug, nome, tributos, resumo, fundamento, precedente, esfera, status_jur, setores, regimes, risco, retroatividade, potencial, tags, destaque) values
('tema-69-icms-pis-cofins', 'Exclusão do ICMS da base do PIS/COFINS', '{PIS,COFINS}',
 'O ICMS destacado na nota não compõe faturamento e deve sair da base de cálculo do PIS/COFINS — a "tese do século".',
 'CF art. 195, I, b; RE 574.706.', 'Tema 69 STF · RE 574.706', 'judicial', 'modulada',
 '{Indústria,Comércio,Serviços,Varejo}', '{lucro_real,lucro_presumido}', 'baixo', '5 anos (modulação 03/2017)',
 'Alto para empresas com saídas tributadas de ICMS relevantes.', '{tese_do_seculo,base_calculo,credito}', true),

('tema-1125-icms-st-pis-cofins', 'Exclusão do ICMS-ST da base do PIS/COFINS', '{PIS,COFINS}',
 'O ICMS retido por substituição tributária (ICMS-ST) também não integra a base do PIS/COFINS do substituído.',
 'Extensão da lógica do Tema 69.', 'Tema 1125 STJ · REsp 1.896.678', 'judicial', 'tese_firmada',
 '{Comércio,Varejo,Distribuição,Combustíveis}', '{lucro_real,lucro_presumido}', 'baixo', '5 anos',
 'Relevante para substituídos tributários com volume de ICMS-ST.', '{icms_st,substituicao,base_calculo}', true),

('tema-118-iss-pis-cofins', 'Exclusão do ISS da base do PIS/COFINS', '{PIS,COFINS,ISS}',
 'Mesma racionalidade do Tema 69 aplicada ao ISS: o imposto municipal não é faturamento do prestador.',
 'CF art. 195, I, b; paralelo ao RE 574.706.', 'Tema 118 STF (pendente de julgamento)', 'judicial', 'em_discussao',
 '{Serviços,Tecnologia,Saúde,Engenharia}', '{lucro_real,lucro_presumido}', 'medio', '5 anos (sujeito a modulação)',
 'Empresas de serviços com ISS relevante; ajuizar para garantir retroatividade.', '{iss,servicos,base_calculo}', true),

('tema-962-selic-indebito', 'Não incidência de IRPJ/CSLL sobre a Selic na repetição de indébito', '{IRPJ,CSLL}',
 'Os juros Selic recebidos na devolução de tributo pago a maior têm natureza indenizatória e não compõem o lucro tributável.',
 'RE 1.063.187.', 'Tema 962 STF', 'judicial', 'tese_firmada',
 '{Indústria,Comércio,Serviços}', '{lucro_real}', 'baixo', '5 anos',
 'Aplicável a quem já recuperou créditos com Selic no período.', '{selic,indebito,juros}', false),

('insumos-pis-cofins', 'Créditos de PIS/COFINS sobre insumos (conceito amplo)', '{PIS,COFINS}',
 'Insumo é tudo que é essencial ou relevante à atividade; o conceito restritivo da RFB foi afastado, abrindo créditos.',
 'REsp 1.221.170 (recurso repetitivo).', 'Tema 779/780 STJ', 'ambas', 'consolidada',
 '{Indústria,Agronegócio,Alimentos,Logística}', '{lucro_real}', 'medio', '5 anos',
 'Revisão de créditos não aproveitados em regime não-cumulativo.', '{insumos,nao_cumulatividade,credito}', true),

('tema-1182-subvencao-icms', 'Exclusão de subvenções de ICMS da base do IRPJ/CSLL', '{IRPJ,CSLL}',
 'Benefícios fiscais de ICMS (crédito presumido e, sob condições, outros) podem ser excluídos da base do IRPJ/CSLL.',
 'LC 160/2017; art. 30 Lei 12.973.', 'Tema 1182 STJ', 'ambas', 'em_discussao',
 '{Indústria,Comércio,Agronegócio}', '{lucro_real}', 'alto', '5 anos',
 'Alto potencial, exige aderência às condições da LC 160 e registro em reserva.', '{subvencao,beneficio_fiscal,icms}', false),

('tema-1048-icms-cprb', 'Exclusão do ICMS da base da CPRB', '{CPRB}',
 'O ICMS não integra a base da Contribuição Previdenciária sobre a Receita Bruta.',
 'Paralelo ao Tema 69.', 'Tema 1048 STF · RE 1.187.264', 'judicial', 'tese_firmada',
 '{Indústria,Construção,TI}', '{lucro_real,lucro_presumido}', 'baixo', '5 anos',
 'Empresas que recolhem CPRB (desoneração da folha).', '{cprb,desoneracao,base_calculo}', false),

('tema-986-tusd-tust', 'ICMS sobre TUSD/TUST na conta de energia', '{ICMS}',
 'Discussão sobre a inclusão das tarifas de uso do sistema de distribuição/transmissão (TUSD/TUST) na base do ICMS-energia.',
 'LC 87/96; EREsp 1.163.020.', 'Tema 986 STJ', 'judicial', 'modulada',
 '{Indústria,Comércio,Varejo,Data Centers}', '{lucro_real,lucro_presumido}', 'medio', '5 anos (com modulação)',
 'Consumidores de energia em alta tensão com TUSD/TUST relevante.', '{energia,tusd,tust}', false),

('tema-985-terco-ferias', 'Contribuição previdenciária sobre o terço de férias e verbas', '{INSS}',
 'Rubricas indenizatórias da folha podem não compor a base da contribuição previdenciária patronal — com ressalvas após o Tema 985.',
 'Súmulas STJ; RE 1.072.485.', 'Tema 985 STF · Tema 20 STJ', 'ambas', 'modulada',
 '{Serviços,Indústria,Varejo,Saúde}', '{lucro_real,lucro_presumido}', 'alto', '5 anos (atenção à modulação)',
 'Folha de pagamento relevante; análise rubrica a rubrica.', '{inss,folha,verbas_indenizatorias}', false),

('pis-cofins-proprio', 'Exclusão do PIS/COFINS da própria base', '{PIS,COFINS}',
 'Tese de que as próprias contribuições não deveriam compor sua base de cálculo.',
 'Derivada da lógica do Tema 69.', 'Discussão em curso (pós-Tema 69)', 'judicial', 'em_discussao',
 '{Indústria,Comércio,Serviços}', '{lucro_real,lucro_presumido}', 'alto', '5 anos (sem trânsito)',
 'Tese mais agressiva; avaliar risco/benefício antes de ajuizar.', '{base_calculo,tese_filhote}', false),

('difal-icms', 'DIFAL do ICMS — exigência sem lei complementar (2022)', '{ICMS}',
 'O diferencial de alíquota exigido em 2022 antes da vigência da LC 190 é questionável quanto à anterioridade.',
 'LC 190/2022; Tema 1093 STF.', 'Tema 1093 STF', 'judicial', 'em_discussao',
 '{Comércio,Varejo,E-commerce}', '{lucro_real,lucro_presumido,simples}', 'medio', 'Exercício de 2022',
 'Empresas que recolheram DIFAL em 2022; janela específica.', '{difal,anterioridade,ecommerce}', false),

('creditos-icms-energia-industria', 'Créditos de ICMS sobre energia elétrica no processo produtivo', '{ICMS}',
 'A energia consumida diretamente no processo industrial gera direito a crédito de ICMS.',
 'LC 87/96, art. 33.', 'Jurisprudência consolidada', 'administrativa', 'consolidada',
 '{Indústria,Agronegócio,Alimentos}', '{lucro_real,lucro_presumido}', 'baixo', '5 anos',
 'Indústrias eletrointensivas; laudo técnico de consumo produtivo.', '{icms,energia,industria,credito}', false)
on conflict (slug) do nothing;

select 'teses v9 ok' as status, count(*) as total from public.teses;
