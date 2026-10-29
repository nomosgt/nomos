-- ============================================================
-- Arché v11 — Dossiê das teses + expansão do banco
-- Novos campos (ficha completa) + enriquecimento dos carros-chefe
-- + 20 teses novas. Idempotente. Rode depois de v9 e v10.
-- ============================================================

-- 1) Campos de dossiê (nullable — preenchíveis à mão ou pela IA)
alter table public.teses add column if not exists fundamentacao_detalhada text;
alter table public.teses add column if not exists jurisprudencia text[] not null default '{}';
alter table public.teses add column if not exists como_identificar text;
alter table public.teses add column if not exists documentos text[] not null default '{}';
alter table public.teses add column if not exists base_calculo text;
alter table public.teses add column if not exists passo_a_passo text[] not null default '{}';
alter table public.teses add column if not exists orgao text;
alter table public.teses add column if not exists prazo_prescricional text;
alter table public.teses add column if not exists relacionadas text[] not null default '{}';
alter table public.teses add column if not exists dossie_ia boolean not null default false;

-- 2) Enriquecimento dos carros-chefe
update public.teses set
  orgao = 'STF', prazo_prescricional = '5 anos',
  fundamentacao_detalhada = 'No RE 574.706 (repercussão geral), o STF fixou que o ICMS destacado na nota fiscal não constitui receita nem faturamento do contribuinte — é mero ingresso que transita pela contabilidade e é repassado ao Estado. Assim, não pode compor a base de PIS/COFINS (CF, art. 195, I, b). A modulação (embargos, 13/05/2021) limitou a recuperação a partir de 15/03/2017, ressalvadas as ações ajuizadas antes dessa data. Prevaleceu o ICMS destacado (não o "a recolher" defendido pela RFB).',
  jurisprudencia = array['RE 574.706/PR — Tema 69 (mérito 15/03/2017)','Embargos de declaração — modulação em 13/05/2021','SC COSIT 13/2018 (posição RFB, superada quanto ao destacado)'],
  como_identificar = 'Empresa com saídas tributadas por ICMS que apurou PIS/COFINS sobre receita contendo o ICMS destacado nos últimos 5 anos (Lucro Real ou Presumido).',
  documentos = array['EFD ICMS/IPI (SPED Fiscal)','EFD-Contribuições','Notas fiscais de saída','Memórias de apuração de PIS/COFINS','DCTF'],
  base_calculo = 'Diferença, mês a mês (últimos 60 meses), entre o PIS/COFINS recolhido e o devido após excluir o ICMS destacado da base, atualizada pela Selic.',
  passo_a_passo = array['Levantar SPED e isolar o ICMS destacado embutido na base','Quantificar o indébito dos últimos 5 anos','Ajuizar ação ou habilitar o crédito (se já há trânsito)','Compensar via PER/DCOMP após habilitação','Acompanhar modulação e trânsito em julgado'],
  relacionadas = array['tema-1125-icms-st-pis-cofins','tema-118-iss-pis-cofins','pc-exclusao-propria-base']
where slug = 'tema-69-icms-pis-cofins';

update public.teses set
  orgao = 'STJ', prazo_prescricional = '5 anos',
  fundamentacao_detalhada = 'O STJ (Tema 1125) estendeu a lógica do Tema 69 ao ICMS-ST: o imposto retido por substituição tributária também não integra a base de PIS/COFINS do contribuinte substituído, pois não é receita própria.',
  jurisprudencia = array['Tema 1125 STJ — REsp 1.896.678 e 1.958.265','Alinhamento ao RE 574.706 (Tema 69)'],
  como_identificar = 'Contribuinte substituído (adquire mercadoria com ICMS-ST retido) que incluiu o ICMS-ST na base de PIS/COFINS.',
  documentos = array['EFD-Contribuições','Notas de aquisição com ICMS-ST','Apuração de PIS/COFINS'],
  base_calculo = 'Indébito mensal (5 anos) após excluir o ICMS-ST da base, atualizado pela Selic.',
  passo_a_passo = array['Mapear aquisições com ICMS-ST retido','Quantificar o ICMS-ST embutido na base de PIS/COFINS','Ajuizar/habilitar e compensar'],
  relacionadas = array['tema-69-icms-pis-cofins','icms-st-restituicao']
where slug = 'tema-1125-icms-st-pis-cofins';

update public.teses set
  orgao = 'STJ', prazo_prescricional = '5 anos',
  fundamentacao_detalhada = 'No REsp 1.221.170 (repetitivo), o STJ definiu que o conceito de insumo para PIS/COFINS é aferido pela essencialidade ou relevância do item à atividade econômica, afastando o conceito restritivo das INs 247/02 e 404/04 da RFB. Abre crédito sobre itens antes glosados.',
  jurisprudencia = array['REsp 1.221.170/PR — Tema 779/780 (repetitivo)','Parecer Normativo COSIT 5/2018 (RFB adequou-se parcialmente)'],
  como_identificar = 'Empresa no Lucro Real (não-cumulatividade) com custos relevantes de produção/serviço não creditados (EPIs, limpeza industrial, frete interno, etc.).',
  documentos = array['EFD-Contribuições','Plano de contas e centro de custos','Laudo de essencialidade dos insumos'],
  base_calculo = 'Créditos não aproveitados sobre insumos essenciais/relevantes, apurados item a item nos últimos 5 anos.',
  passo_a_passo = array['Mapear custos e classificar essencialidade/relevância','Elaborar laudo técnico de insumos','Reconstituir créditos e retificar EFD-Contribuições','Compensar via PER/DCOMP'],
  relacionadas = array['credito-pc-epi-uniforme','credito-pc-frete-transferencia','credito-pc-embalagens']
where slug = 'insumos-pis-cofins';

update public.teses set
  orgao = 'STF', prazo_prescricional = '5 anos',
  fundamentacao_detalhada = 'No RE 1.063.187 (Tema 962), o STF decidiu que os juros de mora (Selic) recebidos na repetição de indébito tributário têm natureza indenizatória, não compondo as bases de IRPJ e CSLL.',
  jurisprudencia = array['RE 1.063.187 — Tema 962 STF','Reflexo em recuperações com atualização pela Selic'],
  como_identificar = 'Empresa no Lucro Real que ofereceu à tributação a parcela de Selic recebida em restituições/compensações.',
  documentos = array['Demonstrações de restituição/compensação','Apuração de IRPJ/CSLL (ECF)','Memória da Selic recebida'],
  base_calculo = 'IRPJ/CSLL pagos sobre a Selic recebida em indébitos nos últimos 5 anos.',
  passo_a_passo = array['Levantar valores de Selic recebidos','Quantificar IRPJ/CSLL incidente','Ajuizar/habilitar e compensar'],
  relacionadas = array['tema-69-icms-pis-cofins','selic-indebito-icms']
where slug = 'tema-962-selic-indebito';

update public.teses set
  orgao = 'STF/STJ', prazo_prescricional = '5 anos',
  fundamentacao_detalhada = 'A jurisprudência afasta a contribuição previdenciária patronal sobre verbas de natureza indenizatória. O terço de férias gozadas teve a incidência discutida no Tema 985 do STF (RE 1.072.485), que reconheceu a incidência com modulação — exige análise rubrica a rubrica e atenção ao marco temporal.',
  jurisprudencia = array['RE 1.072.485 — Tema 985 STF (com modulação)','Tema 20 STJ e súmulas sobre verbas indenizatórias'],
  como_identificar = 'Empresa com folha relevante e rubricas indenizatórias (aviso prévio, 15 dias de auxílio, abono, VT) na base da contribuição patronal.',
  documentos = array['Folha de pagamento analítica','GFIP/eSocial/DCTFWeb','Rubricas e memórias de cálculo'],
  base_calculo = 'Contribuição patronal recolhida sobre rubricas indenizatórias nos últimos 5 anos, observada a modulação.',
  passo_a_passo = array['Mapear rubricas indenizatórias na folha','Separar o que é seguro (aviso prévio, 15 dias) do que está modulado (terço)','Quantificar e ajuizar/compensar'],
  relacionadas = array['inss-aviso-previo','inss-15-dias-doenca','inss-abono-ferias','inss-salario-maternidade']
where slug = 'tema-985-terco-ferias';

-- 3) +20 teses novas
insert into public.teses (slug, nome, tributos, resumo, fundamento, precedente, esfera, status_jur, setores, regimes, risco, retroatividade, potencial, tags, destaque) values
('icms-exportacao-credito','Manutenção de créditos de ICMS nas exportações','{ICMS}','As exportações são imunes e garantem a manutenção e o aproveitamento dos créditos de ICMS das entradas.','CF art. 155, §2º, X, a; LC 87/96.','CF / LC 87/96','administrativa','consolidada','{Indústria,Agronegócio,Exportadores}','{lucro_real,lucro_presumido}','baixo','5 anos','Exportadores com saldo credor acumulado de ICMS.','{icms,exportacao,credito}',false),
('reintegra','REINTEGRA — reintegração de resíduo tributário na exportação','{PIS,COFINS}','Devolução de percentual da receita de exportação para ressarcir resíduo tributário da cadeia.','Lei 13.043/14.','Lei 13.043/14','administrativa','oportunidade','{Indústria,Exportadores,Agronegócio}','{lucro_real,lucro_presumido}','baixo','5 anos','Exportadores de manufaturados; discute-se o percentual.','{reintegra,exportacao}',false),
('funrural','FUNRURAL — discussões de constitucionalidade e base','{INSS}','Questionamentos sobre a contribuição do produtor rural pós-Tema 669, inclusive sub-rogação e base.','Lei 8.212/91; Tema 669.','Tema 669 STF','judicial','em_discussao','{Agronegócio,Pecuária,Frigoríficos}','{lucro_real,lucro_presumido}','medio','5 anos','Produtores rurais e adquirentes (frigoríficos, cooperativas).','{funrural,rural,previdenciario}',false),
('perse-eventos','PERSE — alíquota zero para o setor de eventos','{IRPJ,CSLL,PIS,COFINS}','Benefício de alíquota zero por período determinado ao setor de eventos e turismo.','Lei 14.148/21.','Lei 14.148/21','administrativa','oportunidade','{Eventos,Turismo,Hotelaria,Bares e Restaurantes}','{lucro_real,lucro_presumido}','medio','conforme vigência','Empresas do setor de eventos habilitadas ao PERSE.','{perse,eventos,turismo}',false),
('icms-importacao-res13','ICMS na importação — alíquota de 4% (Resolução SF 13)','{ICMS}','Produtos importados com conteúdo de importação têm alíquota interestadual de 4%, afetando créditos e guerra fiscal.','Resolução SF 13/2012.','Resolução SF 13/2012','administrativa','oportunidade','{Importadores,Indústria,Comércio}','{lucro_real,lucro_presumido}','medio','5 anos','Importadores e revendedores de produtos importados.','{icms,importacao,resolucao13}',false),
('iof-mutuo-grupo','IOF sobre mútuos entre empresas do mesmo grupo','{IOF}','Discussão sobre a incidência de IOF em operações de mútuo entre coligadas/controladas.','Decreto 6.306/07.','Discussão judicial','judicial','em_discussao','{Holdings,Grupos Econômicos}','{lucro_real}','alto','5 anos','Grupos com caixa centralizado e mútuos frequentes.','{iof,mutuo,intercompany}',false),
('pc-icms-nos-creditos','Manutenção do ICMS no cálculo dos créditos de PIS/COFINS','{PIS,COFINS}','Após o Tema 69, a RFB tentou excluir o ICMS também dos créditos (IN/MP); contribuintes defendem a manutenção.','Lógica do Tema 69; IN RFB 2.121/22.','Discussão em curso','judicial','em_discussao','{Indústria,Comércio,Varejo}','{lucro_real}','medio','5 anos','Empresas não-cumulativas com créditos relevantes.','{pis_cofins,creditos,icms}',false),
('presumido-exclusao-icms-iss','Exclusão de ICMS/ISS da base do Lucro Presumido','{IRPJ,CSLL}','Tese de exclusão do ICMS/ISS da receita bruta que serve de base à presunção do lucro.','Derivada do Tema 69.','Discussão em curso','judicial','em_discussao','{Comércio,Serviços,Indústria}','{lucro_presumido}','medio','5 anos','Empresas no Presumido com ICMS/ISS relevante.','{lucro_presumido,base_calculo}',false),
('drawback','Drawback — desoneração de tributos na exportação','{II,IPI,ICMS,PIS,COFINS}','Regime que suspende/isenta tributos sobre insumos destinados à industrialização de produtos exportados.','Lei 11.945/09; legislação aduaneira.','Legislação aduaneira','administrativa','consolidada','{Indústria,Exportadores}','{lucro_real,lucro_presumido}','baixo','conforme habilitação','Indústrias exportadoras que importam/compram insumos.','{drawback,exportacao,aduaneiro}',false),
('ipi-credito-presumido-exportador','Crédito presumido de IPI ao exportador','{IPI,PIS,COFINS}','Ressarcimento de PIS/COFINS incidentes sobre insumos via crédito presumido de IPI para empresas exportadoras.','Lei 9.363/96; Lei 10.276/01.','Lei 9.363/96','administrativa','consolidada','{Indústria,Exportadores}','{lucro_real}','baixo','5 anos','Indústrias exportadoras.','{ipi,credito_presumido,exportacao}',false),
('icms-garantia-estendida','Não incidência de ICMS sobre garantia estendida','{ICMS}','A garantia estendida é serviço securitário/financeiro, fora do campo do ICMS.','Jurisprudência do STJ.','STJ','judicial','consolidada','{Varejo,Eletroeletrônicos,Comércio}','{lucro_real,lucro_presumido}','baixo','5 anos','Varejo que vende garantia estendida.','{icms,garantia_estendida,varejo}',false),
('iss-leasing','ISS sobre leasing financeiro — base e competência','{ISS}','Incidência de ISS no arrendamento mercantil financeiro, com discussão sobre base e município competente.','LC 116/03; Tema 125 STF.','STF','judicial','consolidada','{Bancos,Financeiras,Leasing}','{lucro_real}','medio','5 anos','Instituições de arrendamento mercantil.','{iss,leasing,financeiro}',false),
('inss-plr','Não incidência de contribuição sobre PLR paga conforme a lei','{INSS}','A participação nos lucros e resultados, quando paga nos termos da Lei 10.101/00, não integra a base previdenciária.','Lei 10.101/00.','STF / CARF','ambas','em_discussao','{Indústria,Serviços,Varejo}','{lucro_real,lucro_presumido}','medio','5 anos','Empresas com programa de PLR; atenção aos requisitos formais.','{inss,plr,folha}',false),
('pc-bonificacoes','Não incidência de PIS/COFINS sobre bonificações em mercadorias','{PIS,COFINS}','Bonificações em mercadorias (dúzia de treze) não configuram receita tributável.','Jurisprudência do STJ.','STJ','judicial','em_discussao','{Indústria,Atacado,Varejo}','{lucro_real,lucro_presumido}','medio','5 anos','Indústrias e atacados que concedem bonificações.','{pis_cofins,bonificacao}',false),
('icms-bonificacao','Não incidência de ICMS sobre mercadorias em bonificação','{ICMS}','Mercadorias dadas em bonificação incondicional não compõem a base do ICMS.','Jurisprudência do STJ.','STJ','judicial','consolidada','{Indústria,Atacado,Distribuição}','{lucro_real,lucro_presumido}','baixo','5 anos','Quem concede bonificação incondicional.','{icms,bonificacao}',false),
('itbi-base-1113','ITBI — base de cálculo pelo valor da transação','{ITBI}','O ITBI deve ter por base o valor real da transação, não a base de IPTU ou valor venal de referência.','REsp 1.937.821.','Tema 1113 STJ','judicial','tese_firmada','{Incorporação,Imobiliário,Construção}','{lucro_real,lucro_presumido}','baixo','5 anos','Empresas com aquisições imobiliárias recentes.','{itbi,imobiliario,base_calculo}',false),
('iss-exportacao-servicos','Não incidência de ISS sobre exportação de serviços','{ISS}','Serviços cujo resultado se verifica no exterior são imunes ao ISS.','LC 116/03, art. 2º, I.','LC 116/03','administrativa','consolidada','{TI,Serviços,Engenharia,Consultoria}','{lucro_real,lucro_presumido}','baixo','5 anos','Prestadores que exportam serviços.','{iss,exportacao,servicos}',false),
('pc-combustivel-frota','Créditos de PIS/COFINS sobre combustível de frota própria','{PIS,COFINS}','Combustível essencial à atividade (frota própria de entrega/produção) pode gerar crédito.','Conceito de insumo (REsp 1.221.170).','STJ / CARF','ambas','em_discussao','{Logística,Transporte,Distribuição,Agronegócio}','{lucro_real}','medio','5 anos','Empresas com frota própria relevante.','{pis_cofins,combustivel,insumos}',false),
('inss-vale-alimentacao','Não incidência de contribuição sobre vale-alimentação in natura','{INSS}','O auxílio-alimentação fornecido in natura não integra a base da contribuição previdenciária.','Lei 8.212/91; jurisprudência.','STJ','ambas','consolidada','{Indústria,Serviços,Varejo}','{lucro_real,lucro_presumido}','baixo','5 anos','Empresas que fornecem alimentação in natura.','{inss,vale_alimentacao,folha}',false),
('icms-st-margem','Revisão da margem de valor agregado (MVA) do ICMS-ST','{ICMS}','Discussão sobre MVAs presumidas superiores à realidade de mercado, gerando ICMS-ST a maior.','LC 87/96; convênios.','Via administrativa/judicial','ambas','oportunidade','{Comércio,Distribuição,Varejo}','{lucro_real,lucro_presumido}','medio','5 anos','Setores com MVA elevada e margem real menor.','{icms_st,mva,base_calculo}',false)
on conflict (slug) do nothing;

select 'teses v11 ok' as status, count(*) as total from public.teses;
