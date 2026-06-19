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
