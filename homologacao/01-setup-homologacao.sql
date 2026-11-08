-- ============================================================================
-- ARCHÉ — SETUP COMPLETO DE HOMOLOGAÇÃO (gerado em 2026-11-06)
-- Rode este arquivo INTEIRO no SQL Editor de um projeto Supabase NOVO,
-- separado da produção. Idempotente. NÃO rodar em produção (já aplicada).
-- Ordem: schema → colaboradores → v2..v5 → v7..v22 (limpeza-v6 EXCLUÍDO: apaga dados).
-- ============================================================================

-- ╔══════════════════════ schema.sql ══════════════════════╗

-- ============================================================================
-- NOMOS GT — Schema do banco (Supabase / Postgres)
-- ============================================================================
-- Rode esse arquivo INTEIRO na SQL Editor do Supabase, ou via CLI:
--   supabase db push
-- ============================================================================

-- Extensões necessárias
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABELA: contact_submissions
-- Captura todo formulário de contato + leads do simulador que pediram retorno.
-- ============================================================================
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Dados do lead
  nome text not null,
  email text not null,
  telefone text,
  empresa text,
  cargo text,
  faturamento_estimado text,        -- faixa selecionada (ex: "10M-50M")
  mensagem text,
  resultado_simulacao text,         -- "Caso tenha feito a simulação, conte seu resultado" (opcional)

  -- Tracking
  origem text not null default 'contato',  -- 'contato' | 'simulador' | 'home-cta' | etc
  user_agent text,
  ip_hash text,                            -- hash p/ dedup/rate-limit (não armazena IP cru)
  referrer text,

  -- Vínculo com simulação (se veio do simulador)
  simulator_run_id uuid,                   -- FK adicionada após criar a outra tabela

  -- Workflow interno
  status text not null default 'novo'
    check (status in ('novo', 'em_atendimento', 'qualificado', 'fechado', 'descartado')),
  notas_internas text,
  responsavel_id uuid references auth.users(id) on delete set null
);

create index if not exists idx_contact_submissions_created_at
  on public.contact_submissions (created_at desc);
create index if not exists idx_contact_submissions_status
  on public.contact_submissions (status);
create index if not exists idx_contact_submissions_email
  on public.contact_submissions (email);

-- Migração idempotente: garante coluna resultado_simulacao em DBs antigos
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_submissions'
      and column_name = 'resultado_simulacao'
  ) then
    alter table public.contact_submissions add column resultado_simulacao text;
  end if;
end$$;

-- ============================================================================
-- TABELA: simulator_runs
-- Toda simulação rodada, com ou sem identificação.
-- ============================================================================
create table if not exists public.simulator_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Inputs do usuário
  faturamento numeric(15,2) not null,
  despesa_indireta numeric(15,2) not null,
  setor text not null,
  regime text not null check (regime in ('real', 'presumido')),

  -- Resultados calculados (snapshot — para auditar mesmo se fórmula mudar)
  tese_judicial numeric(15,2) not null,
  tese_administrativa numeric(15,2) not null,
  icms_comercio numeric(15,2) not null default 0,
  total numeric(15,2) not null,

  -- Tracking
  user_agent text,
  ip_hash text,
  referrer text,

  -- Conversão para lead (se o user clicar em "falar com especialista")
  contact_submission_id uuid references public.contact_submissions(id) on delete set null
);

create index if not exists idx_simulator_runs_created_at
  on public.simulator_runs (created_at desc);
create index if not exists idx_simulator_runs_total
  on public.simulator_runs (total desc);

-- FK reverso de contato → simulação (agora que a outra tabela existe)
alter table public.contact_submissions
  drop constraint if exists fk_simulator_run;
alter table public.contact_submissions
  add constraint fk_simulator_run
  foreign key (simulator_run_id)
  references public.simulator_runs(id)
  on delete set null;

-- ============================================================================
-- TABELA: admin_profiles
-- Vincula auth.users a permissões internas (somente quem tem registro aqui
-- pode acessar /admin).
-- ============================================================================
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  nome text,
  role text not null default 'admin'
    check (role in ('admin', 'superadmin', 'viewer'))
);

-- ============================================================================
-- TRIGGER: atualizar updated_at automaticamente
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_contact_submissions_updated_at on public.contact_submissions;
create trigger trg_contact_submissions_updated_at
  before update on public.contact_submissions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Liga RLS em todas as tabelas
alter table public.contact_submissions enable row level security;
alter table public.simulator_runs enable row level security;
alter table public.admin_profiles enable row level security;

-- Helper: usuário atual é admin?
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

-- contact_submissions: público pode INSERT, só admin pode SELECT/UPDATE/DELETE
drop policy if exists "anyone can submit contact" on public.contact_submissions;
create policy "anyone can submit contact"
  on public.contact_submissions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admins read contacts" on public.contact_submissions;
create policy "admins read contacts"
  on public.contact_submissions for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins update contacts" on public.contact_submissions;
create policy "admins update contacts"
  on public.contact_submissions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete contacts" on public.contact_submissions;
create policy "admins delete contacts"
  on public.contact_submissions for delete
  to authenticated
  using (public.is_admin());

-- simulator_runs: público pode INSERT, só admin pode SELECT
drop policy if exists "anyone can log simulation" on public.simulator_runs;
create policy "anyone can log simulation"
  on public.simulator_runs for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admins read simulations" on public.simulator_runs;
create policy "admins read simulations"
  on public.simulator_runs for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins update simulations" on public.simulator_runs;
create policy "admins update simulations"
  on public.simulator_runs for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete simulations" on public.simulator_runs;
create policy "admins delete simulations"
  on public.simulator_runs for delete
  to authenticated
  using (public.is_admin());

-- admin_profiles: cada user vê o próprio perfil; só superadmin manage outros
drop policy if exists "users read own profile" on public.admin_profiles;
create policy "users read own profile"
  on public.admin_profiles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- INSERT/UPDATE/DELETE no admin_profiles SÓ via service_role (sem policy = bloqueado).

-- ============================================================================
-- VIEWS úteis para o dashboard admin
-- ============================================================================

create or replace view public.admin_dashboard_stats as
select
  (select count(*) from public.contact_submissions where status = 'novo') as contatos_novos,
  (select count(*) from public.contact_submissions) as contatos_total,
  (select count(*) from public.simulator_runs where created_at > now() - interval '30 days') as simulacoes_30d,
  (select count(*) from public.simulator_runs) as simulacoes_total,
  (select coalesce(avg(total), 0) from public.simulator_runs where created_at > now() - interval '30 days') as ticket_medio_30d;

grant select on public.admin_dashboard_stats to authenticated;

-- ============================================================================
-- TABELA: blog_posts
-- Conteúdo do blog público, editável pelo admin.
-- ============================================================================
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,

  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null default '',           -- markdown
  categoria text not null,
  read_time int not null default 5,
  author text not null default 'Éverton Vicente',
  cover text not null default '01',         -- chave do número (01..06)
  status text not null default 'rascunho'
    check (status in ('rascunho', 'publicado', 'arquivado'))
);

create index if not exists idx_blog_posts_status_pub
  on public.blog_posts (status, published_at desc);
create index if not exists idx_blog_posts_categoria
  on public.blog_posts (categoria);

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

-- Público lê SÓ posts publicados
drop policy if exists "anyone reads published posts" on public.blog_posts;
create policy "anyone reads published posts"
  on public.blog_posts for select
  to anon, authenticated
  using (status = 'publicado');

-- Admins leem tudo
drop policy if exists "admins read all posts" on public.blog_posts;
create policy "admins read all posts"
  on public.blog_posts for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins manage posts" on public.blog_posts;
create policy "admins manage posts"
  on public.blog_posts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed dos 6 posts originais (idempotente — só insere se slug não existir)
insert into public.blog_posts (slug, title, excerpt, body, categoria, read_time, author, cover, status, published_at)
values
  ('reforma-tributaria-2026-lucro-real', 'Reforma Tributária 2026: o que muda pro Lucro Real',
   'Com a regulamentação da EC 132/2023 entrando em vigor, empresas no Lucro Real precisam revisar suas estratégias. Um mapa do que mudou e do que precisa ser feito antes da virada.',
   E'A regulamentação da Reforma Tributária trouxe à tona um conjunto de mudanças que afetam diretamente empresas optantes pelo Lucro Real. A substituição gradual de PIS, COFINS, ICMS e ISS pela CBS e pelo IBS exige revisão completa da matriz tributária — e a janela para se preparar é curta.\n\nEntre os pontos mais sensíveis estão: a não-cumulatividade ampla (que pode beneficiar setores com alta carga de insumos), o cashback parcial para algumas operações, e o tratamento diferenciado em zonas francas e regimes especiais. Cada um desses tópicos abre tanto oportunidades de redução de carga quanto riscos de autuação na transição.\n\nPara empresas com faturamento acima de R$ 100 milhões, o impacto pode chegar a 4 pontos percentuais sobre a margem operacional — para cima ou para baixo, dependendo de como a transição for conduzida. A janela de planejamento ideal está se fechando.',
   'Reforma Tributária', 8, 'Éverton Vicente', '01', 'publicado', '2026-05-18'::timestamptz),
  ('pis-cofins-icms-st-novo-julgado', 'PIS/COFINS sobre ICMS-ST: novo julgado do STF redesenha a tese',
   'Decisão recente abre nova janela para empresas substituídas tributárias recuperarem créditos significativos. Análise do que mudou e quem deve ajuizar.',
   E'O recente julgamento do STF sobre a inclusão do ICMS-ST na base de cálculo do PIS/COFINS reabriu uma das teses filhotes mais relevantes da última década. A decisão, embora ainda pendente de modulação, indica claramente que valores destacados a título de substituição tributária não compõem o faturamento do contribuinte substituído.\n\nPara empresas atacadistas e varejistas que adquirem mercadorias sujeitas à substituição tributária, o impacto financeiro pode ser substancial. Estimativas preliminares apontam recuperações entre 0,8%% e 2,3%% do faturamento, considerando os últimos 5 anos.\n\nO ponto crítico agora é o ajuizamento preventivo: a modulação de efeitos, quando vier, provavelmente preservará apenas quem já tiver ação distribuída. Esperar pode significar perder o direito retroativo.',
   'Jurisprudência', 6, 'Éverton Vicente', '02', 'publicado', '2026-04-29'::timestamptz),
  ('creditos-esquecidos-operacao', 'Como mapear créditos esquecidos da sua operação',
   'Um framework de 5 etapas para departamentos fiscais identificarem créditos não aproveitados que estão dormindo nos registros contábeis.',
   E'A maior parte das empresas brasileiras tem créditos tributários adormecidos que nunca foram aproveitados — não por má-fé, mas por falta de leitura sistemática. Em diagnósticos recentes, a NOMOS identificou em média R$ 1,2 milhão de créditos não aproveitados por cada R$ 100 milhões de faturamento.\n\nO framework que aplicamos passa por cinco etapas: (1) varredura documental dos últimos 60 meses, (2) cruzamento entre obrigações acessórias e registros contábeis, (3) identificação de teses aplicáveis ao perfil da operação, (4) quantificação preliminar do potencial, e (5) plano de execução priorizado por relação risco/retorno.\n\nOperações industriais e logísticas costumam concentrar a maior parte dos créditos esquecidos, mas mesmo empresas de serviços com Lucro Real apresentam oportunidades não óbvias — especialmente em PIS/COFINS sobre insumos e em IRPJ/CSLL sobre incentivos fiscais estaduais.',
   'Análises', 5, 'Éverton Vicente', '03', 'publicado', '2026-04-12'::timestamptz),
  ('case-logistica-recuperacao', 'Case: operadora logística recupera R$ 8,4M em 9 meses',
   'Como uma transportadora de médio porte combinou três teses tributárias para gerar caixa relevante sem judicialização desnecessária.',
   E'Cliente do setor logístico, com faturamento anual de R$ 180 milhões, procurou a NOMOS com queixas pontuais sobre carga tributária crescente. O diagnóstico inicial revelou uma combinação não óbvia: créditos de PIS/COFINS sobre insumos amplamente aplicáveis ao setor, exposição não tratada em ICMS sobre energia elétrica, e oportunidade de exclusão de subvenções de ICMS da base do IRPJ/CSLL.\n\nA estratégia priorizou as teses com menor risco e maior liquidez — recuperação administrativa via PER/DCOMP antes de qualquer movimento judicial. Em nove meses, o resultado consolidado foi de R$ 8,4 milhões em caixa devolvido, com mais R$ 2,1 milhões em fase final de homologação.\n\nO ponto mais relevante do case não foi o valor: foi a velocidade. O cliente não passou por qualquer autuação adicional, manteve o relacionamento intacto com a Receita Federal e continua hoje em acompanhamento continuado.',
   'Cases', 7, 'Éverton Vicente', '04', 'publicado', '2026-03-22'::timestamptz),
  ('selic-tese-extensao', 'A extensão da tese da Selic — onde ela ainda gera valor',
   'Mesmo após a pacificação no STF, há frentes da tese da Selic que continuam abertas e relevantes para empresas que recuperaram créditos nos últimos anos.',
   E'A tese de não incidência de IR e CSLL sobre a Selic em repetição de indébito foi pacificada favoravelmente pelo STF no Tema 962. Mas o entendimento abriu desdobramentos que continuam relevantes — e que muitas empresas ainda não exploraram.\n\nA principal extensão é a aplicação por simetria ao PIS/COFINS sobre os mesmos valores. Os tribunais inferiores têm acolhido a tese com base no princípio da unidade do ordenamento, e o cenário em segunda instância é amplamente favorável.\n\nPara empresas que recuperaram créditos tributários significativos nos últimos cinco anos, a aplicação dessa extensão pode representar um ganho adicional de 8%% a 15%% sobre o valor já recuperado — sem qualquer custo operacional além do ajuizamento.',
   'Análises', 4, 'Éverton Vicente', '05', 'publicado', '2026-03-08'::timestamptz),
  ('transacao-tributaria-2026', 'Transação tributária em 2026: vale ou não vale aderir?',
   'Com novos editais da PGFN e da RFB, transações tributárias se tornaram ferramenta legítima de gestão. Quando faz sentido entrar e quando é melhor brigar.',
   E'Os programas de transação tributária consolidados a partir da Lei 13.988/2020 mudaram o jogo da gestão de passivos fiscais. Em 2026, com os novos editais de transação por adesão tanto na PGFN quanto na Receita Federal, empresas com débitos relevantes têm uma janela importante de negociação.\n\nA análise sobre aderir ou não passa por três fatores: (1) qualidade jurídica da defesa disponível, (2) custo de oportunidade do caixa que sairia da operação, e (3) impacto cadastral imediato — especialmente em casos onde a regularização permite acesso a certames ou linhas de crédito.\n\nCasos onde a transação costuma valer: passivos de baixa chance jurídica, débitos antigos com juros e multas acumuladas, e situações onde a CND é estratégica para operações da empresa. Casos onde brigar é melhor: autuações com tese sólida disponível e débitos onde a economia tributária da defesa supera o desconto da transação.',
   'Atualizações', 6, 'Éverton Vicente', '06', 'publicado', '2026-02-15'::timestamptz)
on conflict (slug) do nothing;

-- ============================================================================
-- TABELA: cnpj_lookups
-- Cada consulta pública de CNPJ na ferramenta /cnpj fica registrada aqui.
-- Permite ao admin ver quem está pesquisando o quê, e qualificar leads.
-- ============================================================================
create table if not exists public.cnpj_lookups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  cnpj text not null,                       -- 14 dígitos sem pontuação
  razao_social text,
  nome_fantasia text,
  cnae_principal text,
  cnae_descricao text,
  porte text,
  capital_social numeric,
  situacao_cadastral text,
  municipio text,
  uf text,

  -- Output da Claude (JSON estruturado)
  analise jsonb,
  perfil_tributario_sugerido text,          -- 'lucro_real' | 'lucro_presumido' | 'simples' | 'inconclusivo'

  -- Dados brutos das APIs (audit + cache)
  raw_brasilapi jsonb,
  raw_receitaws jsonb,

  -- Tracking
  user_agent text,
  ip_hash text,
  referrer text,

  contact_submission_id uuid references public.contact_submissions(id) on delete set null
);

create index if not exists idx_cnpj_lookups_created_at
  on public.cnpj_lookups (created_at desc);
create index if not exists idx_cnpj_lookups_cnpj
  on public.cnpj_lookups (cnpj);

alter table public.cnpj_lookups enable row level security;

drop policy if exists "anyone can log cnpj lookup" on public.cnpj_lookups;
create policy "anyone can log cnpj lookup"
  on public.cnpj_lookups for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admins read cnpj lookups" on public.cnpj_lookups;
create policy "admins read cnpj lookups"
  on public.cnpj_lookups for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins manage cnpj lookups" on public.cnpj_lookups;
create policy "admins manage cnpj lookups"
  on public.cnpj_lookups for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- SALA NGT — Portal exclusivo de clientes pagantes
-- ============================================================================

-- ---- client_profiles --------------------------------------------------------
-- Cada cliente da NGT tem registro aqui (vinculado a auth.users via convite).
create table if not exists public.client_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  nome text not null,
  empresa text,
  cnpj text,
  cargo text,
  telefone text,

  -- Status interno
  status text not null default 'ativo'
    check (status in ('ativo', 'pausado', 'finalizado', 'inadimplente')),
  -- Métrica de cima do dashboard (admin mantém atualizado conforme execução)
  caixa_recuperado_total numeric(15,2) not null default 0
);

create index if not exists idx_client_profiles_status
  on public.client_profiles (status);
create index if not exists idx_client_profiles_cnpj
  on public.client_profiles (cnpj);

drop trigger if exists trg_client_profiles_updated_at on public.client_profiles;
create trigger trg_client_profiles_updated_at
  before update on public.client_profiles
  for each row execute function public.set_updated_at();

alter table public.client_profiles enable row level security;

-- Helper: é cliente?
create or replace function public.is_client()
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from public.client_profiles where user_id = auth.uid()
  );
$$;

drop policy if exists "client reads own profile" on public.client_profiles;
create policy "client reads own profile"
  on public.client_profiles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "client updates own profile" on public.client_profiles;
create policy "client updates own profile"
  on public.client_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "admins manage clients" on public.client_profiles;
create policy "admins manage clients"
  on public.client_profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- client_cases -----------------------------------------------------------
-- Um cliente pode ter 1+ casos (cada tese ou bloco de recuperação).
create table if not exists public.client_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  client_id uuid not null references public.client_profiles(user_id) on delete cascade,
  titulo text not null,
  tese text,                                  -- ex: "PIS/COFINS Tema 69"
  descricao text,

  -- Workflow padrão da NGT (7 etapas)
  etapa int not null default 1 check (etapa between 1 and 7),
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'pausado', 'concluido', 'arquivado')),

  potencial_estimado numeric(15,2),           -- estimativa inicial
  valor_recuperado numeric(15,2) not null default 0,
  data_inicio date,
  data_estimada_conclusao date,
  proxima_acao text                           -- "Aguardando habilitação Receita"
);

create index if not exists idx_client_cases_client
  on public.client_cases (client_id, created_at desc);
create index if not exists idx_client_cases_status
  on public.client_cases (status);

drop trigger if exists trg_client_cases_updated_at on public.client_cases;
create trigger trg_client_cases_updated_at
  before update on public.client_cases
  for each row execute function public.set_updated_at();

alter table public.client_cases enable row level security;

drop policy if exists "client reads own cases" on public.client_cases;
create policy "client reads own cases"
  on public.client_cases for select
  to authenticated
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage cases" on public.client_cases;
create policy "admins manage cases"
  on public.client_cases for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- case_updates -----------------------------------------------------------
-- Timeline de atualizações que o admin posta no caso. Cliente só lê.
create table if not exists public.case_updates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  autor_id uuid references auth.users(id) on delete set null,

  titulo text not null,
  corpo text,
  tipo text not null default 'info'
    check (tipo in ('info', 'marco', 'recebimento', 'pendencia', 'risco'))
);

create index if not exists idx_case_updates_case
  on public.case_updates (case_id, created_at desc);

alter table public.case_updates enable row level security;

drop policy if exists "client reads updates of own cases" on public.case_updates;
create policy "client reads updates of own cases"
  on public.case_updates for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.client_cases c
      where c.id = case_id and c.client_id = auth.uid()
    )
  );

drop policy if exists "admins manage updates" on public.case_updates;
create policy "admins manage updates"
  on public.case_updates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- case_documents ---------------------------------------------------------
-- Documentos do caso (Supabase Storage guarda arquivo, tabela só metadata).
create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,

  nome text not null,
  storage_path text not null,                 -- caminho no bucket
  tipo_mime text,
  tamanho_bytes int,
  categoria text default 'geral',             -- contrato, relatorio, despacho, nf, balanco, etc
  visibilidade text not null default 'cliente'
    check (visibilidade in ('cliente', 'interno'))  -- 'interno' = só admin vê
);

create index if not exists idx_case_documents_case
  on public.case_documents (case_id, created_at desc);

alter table public.case_documents enable row level security;

drop policy if exists "client reads own case docs" on public.case_documents;
create policy "client reads own case docs"
  on public.case_documents for select
  to authenticated
  using (
    public.is_admin()
    or (
      visibilidade = 'cliente'
      and exists (
        select 1 from public.client_cases c
        where c.id = case_id and c.client_id = auth.uid()
      )
    )
  );

-- Cliente pode subir docs (suas NF-e, balanços) — sempre visibilidade='cliente'
drop policy if exists "client uploads own case docs" on public.case_documents;
create policy "client uploads own case docs"
  on public.case_documents for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      visibilidade = 'cliente'
      and exists (
        select 1 from public.client_cases c
        where c.id = case_id and c.client_id = auth.uid()
      )
    )
  );

drop policy if exists "admins manage docs" on public.case_documents;
create policy "admins manage docs"
  on public.case_documents for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- case_messages ----------------------------------------------------------
-- Chat interno cliente ↔ admin por caso (ou geral, se case_id null).
create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid references public.client_cases(id) on delete cascade,
  client_id uuid not null references public.client_profiles(user_id) on delete cascade,
  autor_id uuid references auth.users(id) on delete set null,
  autor_tipo text not null check (autor_tipo in ('cliente', 'admin')),

  conteudo text not null,
  lido boolean not null default false
);

create index if not exists idx_case_messages_client
  on public.case_messages (client_id, created_at desc);
create index if not exists idx_case_messages_case
  on public.case_messages (case_id, created_at desc);

alter table public.case_messages enable row level security;

drop policy if exists "client reads own messages" on public.case_messages;
create policy "client reads own messages"
  on public.case_messages for select
  to authenticated
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "client posts own messages" on public.case_messages;
create policy "client posts own messages"
  on public.case_messages for insert
  to authenticated
  with check (
    (client_id = auth.uid() and autor_tipo = 'cliente')
    or public.is_admin()
  );

drop policy if exists "admins manage messages" on public.case_messages;
create policy "admins manage messages"
  on public.case_messages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- VIEW: dashboard do cliente --------------------------------------------
create or replace view public.client_dashboard as
select
  cp.user_id,
  cp.nome,
  cp.empresa,
  cp.caixa_recuperado_total,
  (select count(*) from public.client_cases where client_id = cp.user_id and status = 'em_andamento') as casos_em_andamento,
  (select count(*) from public.client_cases where client_id = cp.user_id and status = 'concluido') as casos_concluidos,
  (select count(*) from public.case_messages where client_id = cp.user_id and not lido and autor_tipo = 'admin') as mensagens_nao_lidas
from public.client_profiles cp;

grant select on public.client_dashboard to authenticated;

-- ============================================================================
-- BOOTSTRAP: como criar o primeiro admin
-- ============================================================================
-- 1. No Supabase Dashboard, Authentication → Users → "Add user" (com email/senha)
-- 2. Pegue o user_id desse usuário (UUID).
-- 3. Rode:
--    insert into public.admin_profiles (user_id, nome, role)
--    values ('<UUID-aqui>', 'Éverton Vicente', 'superadmin');
-- ============================================================================

-- ╔══════════════════════ colaboradores.sql ══════════════════════╗

-- ============================================================
-- PORTAL DE PARCEIROS — codigos de acesso
-- Cole este arquivo inteiro no SQL Editor do Supabase e Run.
-- ============================================================

create table if not exists public.parceiros_codigos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  percentual numeric(5,2) not null default 10.00,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultimo_acesso timestamptz
);

-- Sem policies de acesso publico: apenas service_role (API do site) acessa.
alter table public.parceiros_codigos enable row level security;

-- ╔══════════════════════ parceiros-v2.sql ══════════════════════╗

-- =============================================================
-- CENTRAL DO PARCEIRO v2 — sync Supabase (rodar no SQL Editor)
-- =============================================================

-- 1) Hash do cookie de sessão do parceiro (lookup O(1) nas APIs)
alter table public.parceiros_codigos add column if not exists cookie_hash text;
create index if not exists idx_parceiros_cookie_hash
  on public.parceiros_codigos (cookie_hash);

-- 2) Snapshot dos dados do parceiro (clientes, projetos, demandas,
--    comissões, documentos, relatórios) — espelho do que ele vê na Central.
create table if not exists public.parceiro_dados (
  parceiro_id uuid primary key references public.parceiros_codigos(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'parceiro'
    check (updated_by in ('parceiro', 'admin'))
);

-- Sem policies: acesso exclusivamente via service role (API routes).
alter table public.parceiro_dados enable row level security;

-- ╔══════════════════════ financeiro-v3.sql ══════════════════════╗

-- =============================================================
-- FINANCEIRO v3 — Livro-Caixa + Folha do Parceiro + Supervisão
-- (rodar no SQL Editor do Supabase)
-- =============================================================

-- 1) Papel do colaborador: parceiro comum ou supervisor(a)
--    Supervisor vê todos os processos/colaboradores, NUNCA financeiro.
alter table public.parceiros_codigos
  add column if not exists papel text not null default 'parceiro'
  check (papel in ('parceiro', 'supervisor'));

-- 2) Folha oficial do parceiro — SÓ o admin escreve; o parceiro lê o próprio.
create table if not exists public.parceiro_financeiro (
  parceiro_id uuid primary key references public.parceiros_codigos(id) on delete cascade,
  percentual numeric not null default 0,        -- % de retenção/comissão do parceiro
  pendente numeric not null default 0,          -- total pendente de repasse
  proximo_pagamento date,                       -- quando cai o próximo pagamento
  proximo_valor numeric,                        -- valor do próximo pagamento
  historico jsonb not null default '[]'::jsonb, -- [{data, valor, descricao, status}]
  observacoes text,
  updated_at timestamptz not null default now()
);
alter table public.parceiro_financeiro enable row level security;

-- 3) Persistência do Livro-Caixa do admin (snapshot do app)
create table if not exists public.livro_caixa_dados (
  id int primary key default 1 check (id = 1),
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.livro_caixa_dados enable row level security;

-- 4) Bucket privado para arquivos de processo dos colaboradores
--    (acesso só via API com URL assinada — service role)
insert into storage.buckets (id, name, public)
values ('parceiros', 'parceiros', false)
on conflict (id) do nothing;

-- ╔══════════════════════ aprovacoes-v4.sql ══════════════════════╗

-- =============================================================
-- v4 — Aprovações do Cliente + bucket de documentos de caso
-- (rodar no SQL Editor do Supabase)
-- =============================================================

-- 1) Bucket privado dos documentos de caso (a Sala já esperava por ele)
insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false)
on conflict (id) do nothing;

-- 2) Aprovações: admin/colaborador pergunta → cliente aprova ou recusa
create table if not exists public.client_aprovacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.client_profiles(user_id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  origem text not null default 'admin' check (origem in ('admin', 'parceiro')),
  origem_nome text,
  parceiro_id uuid references public.parceiros_codigos(id) on delete set null,
  titulo text not null,
  corpo text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovada', 'recusada')),
  resposta text,
  respondido_em timestamptz
);

create index if not exists idx_aprovacoes_client
  on public.client_aprovacoes (client_id, created_at desc);
create index if not exists idx_aprovacoes_parceiro
  on public.client_aprovacoes (parceiro_id, created_at desc);

alter table public.client_aprovacoes enable row level security;

-- Cliente lê as próprias; admin lê tudo. Escritas só via API (service role).
drop policy if exists "cliente le aprovacoes" on public.client_aprovacoes;
create policy "cliente le aprovacoes"
  on public.client_aprovacoes for select
  to authenticated
  using (public.is_admin() or client_id = auth.uid());

-- ╔══════════════════════ relatorios-v5.sql ══════════════════════╗

-- ============================================================
-- Arché v5 — Gerador de Relatórios (sistema do Éverton no admin)
-- Persistência do snapshot do app (rascunho + relatórios salvos).
-- Escrita/leitura SOMENTE via API admin com service role.
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- ============================================================

create table if not exists public.relatorios_dados (
  id int primary key default 1 check (id = 1),
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.relatorios_dados enable row level security;
-- (sem policies de proposito: acesso apenas pela service role)

-- verificação
select 'relatorios_dados ok' as status, count(*) as linhas from public.relatorios_dados;

-- ╔══════════════════════ tarefas-v7.sql ══════════════════════╗

-- ============================================================
-- Arché v7 — Prazos (deadline) e Checklists por colaborador
-- Admin cria/edita; colaborador vê o prazo e marca os itens.
-- Escrita/leitura SOMENTE via APIs (service role). Idempotente.
-- ============================================================

-- 1) Deadline — um prazo ativo por colaborador
create table if not exists public.parceiro_deadlines (
  parceiro_id uuid primary key references public.parceiros_codigos(id) on delete cascade,
  titulo text,
  prazo timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.parceiro_deadlines enable row level security;

-- 2) Checklists
create table if not exists public.parceiro_checklists (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros_codigos(id) on delete cascade,
  titulo text not null,
  criado_em timestamptz not null default now()
);
alter table public.parceiro_checklists enable row level security;
create index if not exists idx_parceiro_checklists_parceiro
  on public.parceiro_checklists (parceiro_id, criado_em desc);

-- 3) Itens do checklist (com anexo opcional do colaborador)
create table if not exists public.parceiro_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.parceiro_checklists(id) on delete cascade,
  ordem int not null default 0,
  texto text not null,
  feito boolean not null default false,
  feito_em timestamptz,
  anexo_path text,
  anexo_nome text
);
alter table public.parceiro_checklist_itens enable row level security;
create index if not exists idx_checklist_itens_checklist
  on public.parceiro_checklist_itens (checklist_id, ordem);

-- verificação
select 'tarefas v7 ok' as status,
  (select count(*) from public.parceiro_deadlines) as deadlines,
  (select count(*) from public.parceiro_checklists) as checklists;

-- ╔══════════════════════ clientes-v8.sql ══════════════════════╗

-- ============================================================
-- Arché v8 — Atribuição de clientes a colaboradores
-- Admin marca quais clientes da Sala cada colaborador cuida.
-- Acesso só pelas APIs (service role). Idempotente.
-- ============================================================

create table if not exists public.parceiro_clientes (
  parceiro_id uuid not null references public.parceiros_codigos(id) on delete cascade,
  client_id uuid not null references public.client_profiles(user_id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (parceiro_id, client_id)
);
alter table public.parceiro_clientes enable row level security;
create index if not exists idx_parceiro_clientes_cliente
  on public.parceiro_clientes (client_id);

select 'clientes v8 ok' as status;

-- ╔══════════════════════ teses-v9.sql ══════════════════════╗

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

-- ╔══════════════════════ teses-v10.sql ══════════════════════╗

-- ============================================================
-- Arché v10 — Expansão do banco de teses (conhecimento público)
-- Descrições autorais. Idempotente (on conflict do nothing por slug).
-- Rode DEPOIS do teses-v9.
-- ============================================================

insert into public.teses (slug, nome, tributos, resumo, fundamento, precedente, esfera, status_jur, setores, regimes, risco, retroatividade, potencial, tags, destaque) values

-- ───────── PIS / COFINS ─────────
('credito-pc-epi-uniforme','Créditos de PIS/COFINS sobre EPIs, uniformes e itens de segurança','{PIS,COFINS}','Itens de segurança exigidos por norma são essenciais à atividade e geram crédito no regime não-cumulativo.','Conceito de insumo (REsp 1.221.170).','Tema 779/780 STJ (aplicação)','ambas','consolidada','{Indústria,Construção,Saúde,Mineração}','{lucro_real}','baixo','5 anos','Revisão de base de créditos por item de EPI/uniforme.','{insumos,epi,credito}',false),
('credito-pc-frete-transferencia','Créditos de PIS/COFINS sobre frete entre estabelecimentos','{PIS,COFINS}','Frete de produtos acabados entre unidades da mesma empresa como insumo creditável.','Conceito amplo de insumo.','STJ (em evolução)','judicial','em_discussao','{Indústria,Varejo,Logística,Distribuição}','{lucro_real}','medio','5 anos','Empresas com malha logística própria entre filiais.','{frete,insumos,logistica}',false),
('credito-pc-embalagens','Créditos de PIS/COFINS sobre embalagens','{PIS,COFINS}','Materiais de embalagem de apresentação e de transporte podem gerar crédito conforme a atividade.','Conceito de insumo.','Jurisprudência administrativa e STJ','ambas','consolidada','{Indústria,Alimentos,Bebidas,Cosméticos}','{lucro_real}','baixo','5 anos','Indústrias com peso relevante de embalagem.','{embalagem,insumos,credito}',false),
('pc-receitas-financeiras','PIS/COFINS sobre receitas financeiras — majoração por decreto','{PIS,COFINS}','Questiona o restabelecimento de alíquotas sobre receitas financeiras por ato infralegal.','Decreto 8.426/2015; princípio da legalidade.','Discussão judicial em curso','judicial','em_discussao','{Serviços,Holdings,Indústria}','{lucro_real}','medio','5 anos','Empresas com receitas financeiras expressivas.','{receitas_financeiras,legalidade}',false),
('pc-monofasico-revenda','PIS/COFINS monofásico — créditos na revenda','{PIS,COFINS}','Revendedores de produtos sujeitos à tributação monofásica discutem direito a crédito/ressarcimento.','Leis 10.147/00 e 10.485/02.','Discussão em curso','ambas','em_discussao','{Varejo,Farmácias,Autopeças,Combustíveis}','{lucro_real,lucro_presumido}','medio','5 anos','Varejo de medicamentos, autopeças e combustíveis.','{monofasico,revenda,credito}',false),
('pc-importacao-icms','Exclusão do ICMS da base do PIS/COFINS-Importação','{PIS,COFINS}','O ICMS e as próprias contribuições não integram a base do PIS/COFINS na importação.','RE 559.937.','RE 559.937 STF','judicial','tese_firmada','{Indústria,Importadores,Comércio}','{lucro_real,lucro_presumido}','baixo','5 anos','Importadores recorrentes.','{importacao,base_calculo}',false),
('pc-atos-cooperativos','Não incidência de PIS/COFINS sobre atos cooperativos','{PIS,COFINS}','Atos cooperativos típicos não configuram faturamento tributável.','Jurisprudência consolidada.','STJ / STF','judicial','consolidada','{Cooperativas,Agronegócio,Saúde}','{lucro_real,lucro_presumido}','baixo','5 anos','Cooperativas agrícolas, de crédito e de saúde.','{cooperativa,ato_cooperativo}',false),
('pc-exclusao-propria-base','Exclusão do PIS/COFINS da própria base (tese filhote)','{PIS,COFINS}','Tese derivada do Tema 69 de que as contribuições não compõem a própria base.','Lógica do RE 574.706.','Discussão em curso','judicial','em_discussao','{Indústria,Comércio,Serviços}','{lucro_real,lucro_presumido}','alto','5 anos (sem trânsito)','Agressiva; avaliar risco/benefício.','{tese_filhote,base_calculo}',false),

-- ───────── ICMS ─────────
('icms-transferencia-estabelecimentos','Não incidência de ICMS na transferência entre estabelecimentos','{ICMS}','O deslocamento de mercadoria entre unidades do mesmo titular não é fato gerador de ICMS.','Súmula 166 STJ; ADC 49.','ADC 49 STF · Súmula 166 STJ','judicial','tese_firmada','{Indústria,Varejo,Distribuição,Atacado}','{lucro_real,lucro_presumido}','baixo','5 anos','Empresas com transferências interestaduais entre filiais.','{transferencia,adc49}',false),
('icms-demanda-contratada','ICMS sobre demanda contratada de energia','{ICMS}','O ICMS incide apenas sobre a energia efetivamente consumida, não sobre a demanda contratada reservada.','Súmula 391 STJ.','Súmula 391 STJ','ambas','consolidada','{Indústria,Shopping,Data Centers,Comércio}','{lucro_real,lucro_presumido}','baixo','5 anos','Grandes consumidores com contrato de demanda.','{energia,demanda,base_calculo}',false),
('icms-ciap-ativo','Crédito de ICMS sobre ativo imobilizado (CIAP)','{ICMS}','Aquisição de bens do ativo permanente gera crédito de ICMS apropriável em 48 parcelas.','LC 87/96, art. 20.','LC 87/96','administrativa','consolidada','{Indústria,Agronegócio,Transporte}','{lucro_real,lucro_presumido}','baixo','5 anos','Empresas em ciclo de investimento (CAPEX).','{ciap,ativo_imobilizado,credito}',false),
('icms-uso-consumo','Crédito de ICMS sobre bens de uso e consumo','{ICMS}','Direito (prospectivo/diferido) a crédito de ICMS sobre materiais de uso e consumo.','LC 87/96, art. 33.','LC 87/96','administrativa','oportunidade','{Indústria,Comércio}','{lucro_real,lucro_presumido}','medio','conforme vigência','Planejamento de aproveitamento futuro.','{uso_consumo,credito}',false),
('icms-software','Incidência de ISS (não ICMS) sobre software','{ICMS,ISS}','Licenciamento e cessão de software sujeitam-se ao ISS, afastando a cobrança de ICMS.','ADI 5659 e ADI 1945.','ADI 5659 STF','judicial','tese_firmada','{Tecnologia,SaaS,Software}','{lucro_real,lucro_presumido}','medio','5 anos (com modulação)','Empresas de software que recolheram ICMS.','{software,saas,iss}',false),
('icms-st-restituicao','Restituição de ICMS-ST quando a venda é por valor menor','{ICMS}','Cabe restituição do ICMS-ST pago a maior quando a base presumida supera o preço real de venda.','RE 593.849.','Tema 201 STF · RE 593.849','judicial','tese_firmada','{Varejo,Comércio,Combustíveis,Farmácias}','{lucro_real,lucro_presumido,simples}','baixo','5 anos','Substituídos com venda abaixo da base presumida.','{icms_st,restituicao}',false),

-- ───────── IRPJ / CSLL ─────────
('jcp-retroativo','Dedutibilidade de JCP de exercícios anteriores','{IRPJ,CSLL}','Os juros sobre capital próprio podem ser deduzidos retroativamente, sem limitação ao exercício corrente.','Lei 9.249/95, art. 9.','STJ (jurisprudência favorável)','ambas','consolidada','{Holdings,Indústria,Serviços}','{lucro_real}','medio','5 anos','Empresas com patrimônio líquido relevante que não deliberaram JCP.','{jcp,dedutibilidade}',false),
('agio-rentabilidade-futura','Amortização fiscal de ágio por rentabilidade futura','{IRPJ,CSLL}','Aproveitamento do ágio gerado em aquisições com fundamento em rentabilidade futura.','Lei 12.973/14; Lei 9.532/97.','Discussão administrativa (CARF) e judicial','ambas','em_discussao','{Holdings,M&A,Private Equity}','{lucro_real}','alto','5 anos','Grupos com reorganizações societárias e aquisições.','{agio,ma,reorganizacao}',false),
('pat-base-imposto','PAT — dedução sobre o imposto devido','{IRPJ}','A dedução do Programa de Alimentação do Trabalhador deve incidir sobre o imposto, afastando limitações infralegais.','Lei 6.321/76.','Jurisprudência favorável','ambas','consolidada','{Indústria,Serviços,Varejo}','{lucro_real}','baixo','5 anos','Empresas com PAT e muitos colaboradores.','{pat,dedutibilidade,folha}',false),
('irpj-csll-presumido-icms','Exclusão do ICMS da base de presunção no Lucro Presumido','{IRPJ,CSLL}','Tese de exclusão do ICMS da receita que serve de base à presunção do lucro.','Derivada do Tema 69.','Discussão em curso','judicial','em_discussao','{Comércio,Serviços,Indústria}','{lucro_presumido}','medio','5 anos','Empresas no Presumido com ICMS relevante.','{lucro_presumido,base_calculo}',false),

-- ───────── Contribuições previdenciárias (INSS) ─────────
('inss-salario-maternidade','Não incidência de contribuição sobre salário-maternidade','{INSS}','A contribuição patronal não incide sobre o salário-maternidade.','RE 576.967.','Tema 72 STF · RE 576.967','judicial','tese_firmada','{Serviços,Varejo,Saúde,Indústria}','{lucro_real,lucro_presumido}','baixo','5 anos','Folhas com participação feminina relevante.','{inss,salario_maternidade,folha}',false),
('inss-aviso-previo','Não incidência sobre aviso prévio indenizado','{INSS}','A verba de aviso prévio indenizado tem natureza indenizatória, fora da base previdenciária.','Jurisprudência consolidada.','STJ','ambas','consolidada','{Indústria,Serviços,Varejo}','{lucro_real,lucro_presumido}','baixo','5 anos','Empresas com rotatividade de pessoal.','{inss,aviso_previo,folha}',false),
('inss-15-dias-doenca','Não incidência sobre os 15 primeiros dias de afastamento','{INSS}','Os 15 primeiros dias de auxílio-doença não integram a base da contribuição patronal.','Jurisprudência consolidada.','STJ','ambas','consolidada','{Indústria,Serviços,Saúde,Varejo}','{lucro_real,lucro_presumido}','baixo','5 anos','Folhas com afastamentos frequentes.','{inss,auxilio_doenca,folha}',false),
('inss-terceiros-20sm','Limite de 20 salários mínimos para contribuições a terceiros','{INSS}','A base das contribuições ao Sistema S limitada a 20 salários mínimos.','REsp 1.898.532 / 1.905.870.','Tema 1079 STJ','judicial','modulada','{Indústria,Serviços,Varejo,Saúde}','{lucro_real,lucro_presumido}','medio','conforme modulação','Folhas de alto valor; atenção à modulação.','{inss,sistema_s,terceiros}',false),
('inss-sat-rat-fap','Revisão do enquadramento SAT/RAT/FAP','{INSS}','Revisão da alíquota de risco (SAT/RAT ajustada pelo FAP) conforme a atividade preponderante real.','Legislação previdenciária.','Via administrativa','administrativa','oportunidade','{Indústria,Construção,Transporte}','{lucro_real,lucro_presumido}','medio','5 anos','Empresas com enquadramento de risco superdimensionado.','{inss,sat,rat,fap}',false),
('inss-vale-transporte-pecunia','Não incidência sobre vale-transporte em pecúnia','{INSS}','O vale-transporte, mesmo pago em dinheiro, não integra a base previdenciária.','STF.','STF','ambas','consolidada','{Serviços,Varejo,Indústria}','{lucro_real,lucro_presumido}','baixo','5 anos','Empresas que pagam VT em pecúnia.','{inss,vale_transporte,folha}',false),
('inss-abono-ferias','Não incidência sobre abono pecuniário de férias','{INSS}','A conversão de 1/3 das férias em pecúnia tem natureza indenizatória.','Jurisprudência consolidada.','STJ','ambas','consolidada','{Indústria,Serviços,Varejo}','{lucro_real,lucro_presumido}','baixo','5 anos','Folhas com venda de férias recorrente.','{inss,abono_ferias,folha}',false),

-- ───────── ISS ─────────
('iss-local-recolhimento','Definição do município competente para o ISS','{ISS}','Discussão sobre o município devido (estabelecimento prestador x local da prestação), evitando bitributação.','LC 116/03.','LC 116/03 · STJ','ambas','oportunidade','{Serviços,Construção,TI,Engenharia}','{lucro_real,lucro_presumido,simples}','medio','5 anos','Prestadores que atuam em vários municípios.','{iss,competencia,bitributacao}',false),
('iss-construcao-materiais','Dedução de materiais da base do ISS na construção civil','{ISS}','Os materiais empregados e tributados pelo ICMS podem ser deduzidos da base do ISS na construção.','RE 603.497.','STF · RE 603.497','judicial','consolidada','{Construção,Engenharia,Incorporação}','{lucro_real,lucro_presumido}','baixo','5 anos','Construtoras e incorporadoras.','{iss,construcao,materiais}',false),

-- ───────── IPI / outros ─────────
('ipi-insumos-aliquota-zero','Crédito de IPI sobre insumos NT/isentos/alíquota zero','{IPI}','Discussão sobre o direito a crédito de IPI na entrada de insumos desonerados.','Jurisprudência oscilante do STF.','STF (em discussão)','judicial','em_discussao','{Indústria}','{lucro_real}','alto','5 anos','Indústrias com cadeia de insumos desonerados.','{ipi,credito,aliquota_zero}',false),
('ipi-selic-ressarcimento','Correção pela Selic no ressarcimento de IPI','{IPI}','Créditos de IPI ressarcidos com demora administrativa devem ser corrigidos pela Selic.','Jurisprudência consolidada.','STJ','ambas','consolidada','{Indústria,Exportadores}','{lucro_real}','baixo','5 anos','Exportadores com saldo credor acumulado.','{ipi,selic,ressarcimento}',false),
('cprb-iss-exclusao','Exclusão do ISS da base da CPRB','{CPRB,ISS}','O ISS não integra a base da Contribuição Previdenciária sobre a Receita Bruta.','Paralelo ao Tema 1048.','Discussão em curso','judicial','em_discussao','{TI,Construção,Serviços}','{lucro_real,lucro_presumido}','medio','5 anos','Empresas na desoneração que prestam serviços.','{cprb,iss,base_calculo}',false),
('multa-confiscatoria','Limitação de multas tributárias confiscatórias','{IRPJ,ICMS,ISS}','Multas punitivas acima de 100% do tributo podem ser reduzidas por caráter confiscatório.','CF art. 150, IV.','STF (vários temas)','judicial','em_discussao','{Indústria,Comércio,Serviços}','{lucro_real,lucro_presumido}','medio','conforme autuação','Empresas autuadas com multas elevadas.','{multa,confisco,contencioso}',false),
('taxa-siscomex','Majoração indevida da Taxa Siscomex','{Taxa}','A majoração da Taxa Siscomex acima da correção monetária é questionável.','Lei 9.716/98; jurisprudência.','STF / STJ','judicial','consolidada','{Importadores,Comércio Exterior,Indústria}','{lucro_real,lucro_presumido}','baixo','5 anos','Importadores com volume de DIs.','{siscomex,importacao,taxa}',false),
('selic-indebito-icms','Correção pela Selic na repetição de indébito de ICMS','{ICMS}','Valores de ICMS recuperados devem ser corrigidos pela Selic desde o pagamento indevido.','Jurisprudência consolidada.','STJ','ambas','consolidada','{Indústria,Comércio,Varejo}','{lucro_real,lucro_presumido}','baixo','5 anos','Complementa recuperações de ICMS.','{selic,indebito,correcao}',false),
('exclusao-difal-base-pc','Exclusão do DIFAL/ICMS da base do PIS/COFINS','{PIS,COFINS,ICMS}','Extensão do Tema 69 ao diferencial de alíquota do ICMS compondo a base do PIS/COFINS.','Lógica do RE 574.706.','Discussão em curso','judicial','em_discussao','{Comércio,Varejo,E-commerce}','{lucro_real,lucro_presumido}','medio','5 anos','Empresas com DIFAL relevante.','{difal,base_calculo}',false)

on conflict (slug) do nothing;

select 'teses v10 ok' as status, count(*) as total from public.teses;

-- ╔══════════════════════ teses-v11.sql ══════════════════════╗

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

-- ╔══════════════════════ atividades-v12.sql ══════════════════════╗

-- ============================================================
-- Arché v12 — Gestão de Atividades (tarefas das advogadas) + alertas
-- Aditivo e idempotente. NÃO apaga nem recria nada existente.
-- Acesso só pelas APIs (admin service-role / parceiro por cookie).
-- ============================================================

-- 1) Atividade: unidade de trabalho com responsável, cliente, caso, prazo, status
create table if not exists public.atividades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  parceiro_id uuid references public.parceiros_codigos(id) on delete set null,  -- responsável (advogada)
  client_id  uuid references public.client_profiles(user_id) on delete set null, -- cliente vinculado
  case_id    uuid references public.client_cases(id) on delete set null,         -- processo/serviço
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta')),
  status     text not null default 'pendente' check (status in ('pendente','em_andamento','concluida')),
  prazo timestamptz,
  concluida_em timestamptz,
  visivel_cliente boolean not null default false,  -- conclusão vira atualização no portal do cliente
  criado_por text not null default 'admin',        -- admin | parceiro
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.atividades enable row level security;
create index if not exists idx_atividades_parceiro on public.atividades (parceiro_id, status);
create index if not exists idx_atividades_cliente on public.atividades (client_id);
create index if not exists idx_atividades_prazo on public.atividades (prazo);

-- 2) Histórico de alterações relevantes
create table if not exists public.atividade_historico (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  evento text not null,
  autor text,
  created_at timestamptz not null default now()
);
alter table public.atividade_historico enable row level security;
create index if not exists idx_ativ_hist on public.atividade_historico (atividade_id, created_at desc);

-- 3) Alertas (atraso / 24h / 48h) — dedup por (atividade, tipo); resolvido ao concluir/reagendar
create table if not exists public.atividade_alertas (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  tipo text not null check (tipo in ('atraso','aviso_48h','aviso_24h')),
  gerado_em timestamptz not null default now(),
  resolvido boolean not null default false,
  resolvido_em timestamptz,
  unique (atividade_id, tipo)
);
alter table public.atividade_alertas enable row level security;
create index if not exists idx_ativ_alertas on public.atividade_alertas (resolvido, tipo);

select 'atividades v12 ok' as status,
  (select count(*) from public.atividades) as atividades;

-- ╔══════════════════════ auditoria-v13.sql ══════════════════════╗

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

-- ╔══════════════════════ anexos-v14.sql ══════════════════════╗

-- ============================================================
-- Arché v14 — Anexos em atividades. Aditivo e idempotente.
-- Reusa o bucket 'case-documents'. Rode depois do v12/v13.
-- ============================================================

create table if not exists public.atividade_anexos (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  nome text not null,
  storage_path text not null,
  tipo_mime text,
  tamanho_bytes bigint,
  visibilidade text not null default 'interno' check (visibilidade in ('cliente','interno')),
  uploader_tipo text not null default 'admin' check (uploader_tipo in ('admin','parceiro')),
  uploader_id uuid,            -- admin: auth.users.id; parceiro: parceiros_codigos.id
  uploader_nome text,          -- rótulo amigável (nome do colaborador / "Equipe Arché")
  case_document_id uuid references public.case_documents(id) on delete set null, -- espelho na aba Documentos
  arquivado boolean not null default false,
  arquivado_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.atividade_anexos enable row level security;
create index if not exists idx_atividade_anexos_ativ on public.atividade_anexos (atividade_id, arquivado, created_at desc);

-- vínculo opcional do documento do caso de volta à atividade de origem (para rastreio)
alter table public.case_documents add column if not exists atividade_id uuid references public.atividades(id) on delete set null;

select 'anexos v14 ok' as status;

-- ╔══════════════════════ aprovacoes-v15.sql ══════════════════════╗

-- ============================================================
-- Arché v15 — Aprovações ricas: campos estruturados, protocolo,
-- termos aceitos, fluxo de ajuste e trilha de eventos.
-- Aditivo e idempotente. Rode depois do v4.
-- ============================================================

-- 1) Campos estruturados da autorização (todos opcionais)
alter table public.client_aprovacoes add column if not exists valor_credito numeric(14,2);
alter table public.client_aprovacoes add column if not exists tributos text;
alter table public.client_aprovacoes add column if not exists periodo_apuracao text;
alter table public.client_aprovacoes add column if not exists modalidade text;
alter table public.client_aprovacoes add column if not exists inicio_previsto text;
alter table public.client_aprovacoes add column if not exists impacto_caixa text;
alter table public.client_aprovacoes add column if not exists fundamentacao text;
alter table public.client_aprovacoes add column if not exists risco text;          -- baixo | medio | alto (texto livre)
alter table public.client_aprovacoes add column if not exists honorarios text;
alter table public.client_aprovacoes add column if not exists prazo_decisao timestamptz;

-- 2) Decisão: protocolo único + termos aceitos + quem decidiu
alter table public.client_aprovacoes add column if not exists protocolo text;
alter table public.client_aprovacoes add column if not exists termos_versao text;
alter table public.client_aprovacoes add column if not exists termos_aceitos_em timestamptz;
alter table public.client_aprovacoes add column if not exists decidido_por_nome text;
-- protocolo único quando presente
create unique index if not exists uq_aprovacoes_protocolo on public.client_aprovacoes (protocolo) where protocolo is not null;

-- 3) Fluxo de ajuste
alter table public.client_aprovacoes add column if not exists ajuste_motivo text;
alter table public.client_aprovacoes add column if not exists ajuste_obs text;
alter table public.client_aprovacoes add column if not exists ajuste_solicitado_em timestamptz;
alter table public.client_aprovacoes add column if not exists revisao integer not null default 0;

-- 4) Novo status permitido: ajuste_solicitado
alter table public.client_aprovacoes drop constraint if exists client_aprovacoes_status_check;
alter table public.client_aprovacoes add constraint client_aprovacoes_status_check
  check (status in ('pendente', 'aprovada', 'recusada', 'ajuste_solicitado'));

-- 5) Anexos da aprovação (reusa case_documents; vínculo rastreável)
alter table public.case_documents add column if not exists aprovacao_id uuid references public.client_aprovacoes(id) on delete set null;
create index if not exists idx_case_documents_aprovacao on public.case_documents (aprovacao_id);

-- 6) Trilha de eventos da aprovação (auditoria)
create table if not exists public.aprovacao_eventos (
  id uuid primary key default gen_random_uuid(),
  aprovacao_id uuid not null references public.client_aprovacoes(id) on delete cascade,
  evento text not null,          -- criada | decidida | ajuste_solicitado | reapresentada
  detalhe text,
  autor text,
  created_at timestamptz not null default now()
);
alter table public.aprovacao_eventos enable row level security;
create index if not exists idx_aprovacao_eventos on public.aprovacao_eventos (aprovacao_id, created_at desc);

select 'aprovacoes v15 ok' as status;

-- ╔══════════════════════ mensagens-anexo-v16.sql ══════════════════════╗

-- ============================================================
-- Arché v16 — Anexo em mensagens do chat cliente ↔ equipe.
-- Reusa o bucket case-documents. Aditivo e idempotente.
-- ============================================================

alter table public.case_messages add column if not exists anexo_path text;
alter table public.case_messages add column if not exists anexo_nome text;
alter table public.case_messages add column if not exists anexo_mime text;

select 'mensagens anexo v16 ok' as status;

-- ╔══════════════════════ documentos-v17.sql ══════════════════════╗

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

-- ╔══════════════════════ financeiro-v18.sql ══════════════════════╗

-- ============================================================
-- Arché v18 — Livro de lançamentos financeiros por caso.
-- Cada valor financeiro é um LANÇAMENTO rastreável (não um total
-- editável solto). Os estágios são distintos e não se somam entre si.
-- Aditivo e idempotente.
-- ============================================================

create table if not exists public.case_financeiro (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  client_id uuid references public.client_profiles(user_id) on delete set null,  -- isolamento/consulta
  tipo text not null check (tipo in ('potencial','apurado','compensacao','recuperado','honorarios','ajuste')),
  valor numeric(14,2) not null,                 -- dinheiro: numeric, nunca float
  data_referencia date,
  descricao text,
  justificativa text,                           -- obrigatória para ajustes (validado na API)
  autor uuid,                                   -- admin responsável
  autor_nome text,
  created_at timestamptz not null default now()
);

alter table public.case_financeiro enable row level security;
-- sem policy pública: só service-role (admin). O cliente NÃO lê o livro bruto;
-- a Sala continua lendo os valores consolidados do caso/perfil.
create index if not exists idx_case_financeiro_case on public.case_financeiro (case_id, tipo, created_at desc);
create index if not exists idx_case_financeiro_client on public.case_financeiro (client_id, created_at desc);

select 'financeiro v18 ok' as status;

-- ╔══════════════════════ financeiro-v19.sql ══════════════════════╗

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

-- ╔══════════════════════ cadastro-v20.sql ══════════════════════╗

-- ============================================================
-- Arché v20 — Dados cadastrais do cliente + trilha de auditoria.
-- Aditivo e idempotente. NÃO altera identidade de autenticação.
-- ============================================================

alter table public.client_profiles add column if not exists nome_fantasia text;
alter table public.client_profiles add column if not exists consultor text;       -- consultor designado
alter table public.client_profiles add column if not exists observacoes text;      -- observações administrativas internas

-- trilha de auditoria cadastral (campo a campo)
create table if not exists public.client_profile_audit (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.client_profiles(user_id) on delete set null,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  autor uuid,
  autor_nome text,
  created_at timestamptz not null default now()
);
alter table public.client_profile_audit enable row level security;
create index if not exists idx_client_profile_audit on public.client_profile_audit (client_id, created_at desc);

select 'cadastro v20 ok' as status;

-- ╔══════════════════════ financeiro-v21.sql ══════════════════════╗

-- ============================================================
-- Arché v21 — Atomicidade financeira transacional.
-- Insere o lançamento E recalcula os indicadores (caso + cliente)
-- numa ÚNICA transação (corpo de função plpgsql = atômico).
-- Se qualquer passo falhar, nada é persistido (rollback automático).
-- Aditivo. SECURITY DEFINER com search_path fixo e grant restrito.
-- ============================================================

create or replace function public.financeiro_lancar(
  p_case_id uuid,
  p_tipo text,
  p_estagio_alvo text,
  p_valor numeric,
  p_data_referencia date,
  p_descricao text,
  p_justificativa text,
  p_autor uuid,
  p_autor_nome text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_titulo text;
  v_rec numeric := 0;
  v_pot numeric := 0;
  v_total numeric := 0;
begin
  -- trava a linha do caso para evitar corrida no recálculo
  select client_id, titulo into v_client, v_titulo
  from public.client_cases where id = p_case_id for update;
  if not found then
    raise exception 'caso_nao_encontrado';
  end if;

  insert into public.case_financeiro
    (case_id, client_id, case_titulo, tipo, estagio_alvo, valor, data_referencia, descricao, justificativa, autor, autor_nome)
  values
    (p_case_id, v_client, v_titulo, p_tipo, p_estagio_alvo, p_valor, p_data_referencia, p_descricao, p_justificativa, p_autor, p_autor_nome);

  -- recomputa do ZERO (idempotente): ajustes entram no estágio alvo
  select
    coalesce(sum(case when tipo='recuperado' then valor
                      when tipo='ajuste' and estagio_alvo='recuperado' then valor else 0 end), 0),
    coalesce(sum(case when tipo='potencial' then valor
                      when tipo='ajuste' and estagio_alvo='potencial' then valor else 0 end), 0)
  into v_rec, v_pot
  from public.case_financeiro where case_id = p_case_id;

  update public.client_cases
     set valor_recuperado = v_rec, potencial_estimado = nullif(v_pot, 0)
   where id = p_case_id;

  if v_client is not null then
    select coalesce(sum(valor_recuperado), 0) into v_total
    from public.client_cases where client_id = v_client;
    update public.client_profiles set caixa_recuperado_total = v_total where user_id = v_client;
  end if;

  return jsonb_build_object('recuperado', v_rec, 'potencial', v_pot, 'totalCliente', coalesce(v_total, 0));
end;
$$;

-- privilégio restrito: só o service-role (backend) executa
revoke all on function public.financeiro_lancar(uuid,text,text,numeric,date,text,text,uuid,text) from public;
revoke all on function public.financeiro_lancar(uuid,text,text,numeric,date,text,text,uuid,text) from anon;
revoke all on function public.financeiro_lancar(uuid,text,text,numeric,date,text,text,uuid,text) from authenticated;
grant execute on function public.financeiro_lancar(uuid,text,text,numeric,date,text,text,uuid,text) to service_role;

select 'financeiro v21 ok' as status;

-- ╔══════════════════════ casos-v22.sql ══════════════════════╗

-- ============================================================
-- Arché v22 — Campos de caso (responsável, período de apuração) +
-- trilha de auditoria de casos (edições administrativas).
-- Registra campo a campo (de/para), autor e data. Aditivo e idempotente.
-- ============================================================

alter table public.client_cases add column if not exists responsavel text;
alter table public.client_cases add column if not exists periodo_apuracao text;

create table if not exists public.case_audit (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.client_cases(id) on delete set null,
  client_id uuid references public.client_profiles(user_id) on delete set null,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  autor uuid,
  autor_nome text,
  created_at timestamptz not null default now()
);
alter table public.case_audit enable row level security;
create index if not exists idx_case_audit on public.case_audit (case_id, created_at desc);

select 'casos v22 ok' as status;
 
-- ====================== central-v23.sql ====================== 
 
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
