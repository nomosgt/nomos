export type Categoria =
  | "Reforma Tributária"
  | "Jurisprudência"
  | "Cases"
  | "Análises"
  | "Atualizações";

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  categoria: Categoria;
  date: string;
  readTime: number;
  author: string;
  cover: string;
}

export const POSTS: Post[] = [
  {
    slug: "reforma-tributaria-2026-lucro-real",
    title: "Reforma Tributária 2026: o que muda pro Lucro Real",
    excerpt:
      "Com a regulamentação da EC 132/2023 entrando em vigor, empresas no Lucro Real precisam revisar suas estratégias. Um mapa do que mudou e do que precisa ser feito antes da virada.",
    body: [
      "A regulamentação da Reforma Tributária trouxe à tona um conjunto de mudanças que afetam diretamente empresas optantes pelo Lucro Real. A substituição gradual de PIS, COFINS, ICMS e ISS pela CBS e pelo IBS exige revisão completa da matriz tributária — e a janela para se preparar é curta.",
      "Entre os pontos mais sensíveis estão: a não-cumulatividade ampla (que pode beneficiar setores com alta carga de insumos), o cashback parcial para algumas operações, e o tratamento diferenciado em zonas francas e regimes especiais. Cada um desses tópicos abre tanto oportunidades de redução de carga quanto riscos de autuação na transição.",
      "Para empresas com faturamento acima de R$ 100 milhões, o impacto pode chegar a 4 pontos percentuais sobre a margem operacional — para cima ou para baixo, dependendo de como a transição for conduzida. A janela de planejamento ideal está se fechando.",
    ],
    categoria: "Reforma Tributária",
    date: "2026-05-18",
    readTime: 8,
    author: "Éverton Vicente",
    cover: "01",
  },
  {
    slug: "pis-cofins-icms-st-novo-julgado",
    title: "PIS/COFINS sobre ICMS-ST: novo julgado do STF redesenha a tese",
    excerpt:
      "Decisão recente abre nova janela para empresas substituídas tributárias recuperarem créditos significativos. Análise do que mudou e quem deve ajuizar.",
    body: [
      "O recente julgamento do STF sobre a inclusão do ICMS-ST na base de cálculo do PIS/COFINS reabriu uma das teses filhotes mais relevantes da última década. A decisão, embora ainda pendente de modulação, indica claramente que valores destacados a título de substituição tributária não compõem o faturamento do contribuinte substituído.",
      "Para empresas atacadistas e varejistas que adquirem mercadorias sujeitas à substituição tributária, o impacto financeiro pode ser substancial. Estimativas preliminares apontam recuperações entre 0,8% e 2,3% do faturamento, considerando os últimos 5 anos.",
      "O ponto crítico agora é o ajuizamento preventivo: a modulação de efeitos, quando vier, provavelmente preservará apenas quem já tiver ação distribuída. Esperar pode significar perder o direito retroativo.",
    ],
    categoria: "Jurisprudência",
    date: "2026-04-29",
    readTime: 6,
    author: "Éverton Vicente",
    cover: "02",
  },
  {
    slug: "creditos-esquecidos-operacao",
    title: "Como mapear créditos esquecidos da sua operação",
    excerpt:
      "Um framework de 5 etapas para departamentos fiscais identificarem créditos não aproveitados que estão dormindo nos registros contábeis.",
    body: [
      "A maior parte das empresas brasileiras tem créditos tributários adormecidos que nunca foram aproveitados — não por má-fé, mas por falta de leitura sistemática. Em diagnósticos recentes, a NOMOS identificou em média R$ 1,2 milhão de créditos não aproveitados por cada R$ 100 milhões de faturamento.",
      "O framework que aplicamos passa por cinco etapas: (1) varredura documental dos últimos 60 meses, (2) cruzamento entre obrigações acessórias e registros contábeis, (3) identificação de teses aplicáveis ao perfil da operação, (4) quantificação preliminar do potencial, e (5) plano de execução priorizado por relação risco/retorno.",
      "Operações industriais e logísticas costumam concentrar a maior parte dos créditos esquecidos, mas mesmo empresas de serviços com Lucro Real apresentam oportunidades não óbvias — especialmente em PIS/COFINS sobre insumos e em IRPJ/CSLL sobre incentivos fiscais estaduais.",
    ],
    categoria: "Análises",
    date: "2026-04-12",
    readTime: 5,
    author: "Éverton Vicente",
    cover: "03",
  },
  {
    slug: "case-logistica-recuperacao",
    title: "Case: operadora logística recupera R$ 8,4M em 9 meses",
    excerpt:
      "Como uma transportadora de médio porte combinou três teses tributárias para gerar caixa relevante sem judicialização desnecessária.",
    body: [
      "Cliente do setor logístico, com faturamento anual de R$ 180 milhões, procurou a NOMOS com queixas pontuais sobre carga tributária crescente. O diagnóstico inicial revelou uma combinação não óbvia: créditos de PIS/COFINS sobre insumos amplamente aplicáveis ao setor, exposição não tratada em ICMS sobre energia elétrica, e oportunidade de exclusão de subvenções de ICMS da base do IRPJ/CSLL.",
      "A estratégia priorizou as teses com menor risco e maior liquidez — recuperação administrativa via PER/DCOMP antes de qualquer movimento judicial. Em nove meses, o resultado consolidado foi de R$ 8,4 milhões em caixa devolvido, com mais R$ 2,1 milhões em fase final de homologação.",
      "O ponto mais relevante do case não foi o valor: foi a velocidade. O cliente não passou por qualquer autuação adicional, manteve o relacionamento intacto com a Receita Federal e continua hoje em acompanhamento continuado.",
    ],
    categoria: "Cases",
    date: "2026-03-22",
    readTime: 7,
    author: "Éverton Vicente",
    cover: "04",
  },
  {
    slug: "selic-tese-extensao",
    title: "A extensão da tese da Selic — onde ela ainda gera valor",
    excerpt:
      "Mesmo após a pacificação no STF, há frentes da tese da Selic que continuam abertas e relevantes para empresas que recuperaram créditos nos últimos anos.",
    body: [
      "A tese de não incidência de IR e CSLL sobre a Selic em repetição de indébito foi pacificada favoravelmente pelo STF no Tema 962. Mas o entendimento abriu desdobramentos que continuam relevantes — e que muitas empresas ainda não exploraram.",
      "A principal extensão é a aplicação por simetria ao PIS/COFINS sobre os mesmos valores. Os tribunais inferiores têm acolhido a tese com base no princípio da unidade do ordenamento, e o cenário em segunda instância é amplamente favorável.",
      "Para empresas que recuperaram créditos tributários significativos nos últimos cinco anos, a aplicação dessa extensão pode representar um ganho adicional de 8% a 15% sobre o valor já recuperado — sem qualquer custo operacional além do ajuizamento.",
    ],
    categoria: "Análises",
    date: "2026-03-08",
    readTime: 4,
    author: "Éverton Vicente",
    cover: "05",
  },
  {
    slug: "transacao-tributaria-2026",
    title: "Transação tributária em 2026: vale ou não vale aderir?",
    excerpt:
      "Com novos editais da PGFN e da RFB, transações tributárias se tornaram ferramenta legítima de gestão. Quando faz sentido entrar e quando é melhor brigar.",
    body: [
      "Os programas de transação tributária consolidados a partir da Lei 13.988/2020 mudaram o jogo da gestão de passivos fiscais. Em 2026, com os novos editais de transação por adesão tanto na PGFN quanto na Receita Federal, empresas com débitos relevantes têm uma janela importante de negociação.",
      "A análise sobre aderir ou não passa por três fatores: (1) qualidade jurídica da defesa disponível, (2) custo de oportunidade do caixa que sairia da operação, e (3) impacto cadastral imediato — especialmente em casos onde a regularização permite acesso a certames ou linhas de crédito.",
      "Casos onde a transação costuma valer: passivos de baixa chance jurídica, débitos antigos com juros e multas acumuladas, e situações onde a CND é estratégica para operações da empresa. Casos onde brigar é melhor: autuações com tese sólida disponível e débitos onde a economia tributária da defesa supera o desconto da transação.",
    ],
    categoria: "Atualizações",
    date: "2026-02-15",
    readTime: 6,
    author: "Éverton Vicente",
    cover: "06",
  },
];

export const CATEGORIAS: Categoria[] = [
  "Reforma Tributária",
  "Jurisprudência",
  "Cases",
  "Análises",
  "Atualizações",
];
