export type Status =
  | "vigor"
  | "discussao"
  | "favoravel"
  | "desfavoravel";

export type Esfera = "federal" | "estadual" | "municipal";
export type Via = "judicial" | "administrativa";
export type Risco = "verde" | "amarelo" | "vermelho";

export interface Tese {
  slug: string;
  title: string;
  tributos: string[];
  status: Status;
  esfera: Esfera;
  via: Via;
  risco: Risco;
  ano: number;
  resumo: string;
  analise: string;
  base: string;
}

export const STATUS_LABEL: Record<Status, string> = {
  vigor: "Em vigor",
  discussao: "Em discussão",
  favoravel: "Decidida favorável",
  desfavoravel: "Decidida desfavorável",
};

export const STATUS_TONE: Record<Status, string> = {
  vigor: "text-[color:var(--color-brand)] border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/5",
  discussao: "text-[color:var(--color-ink-muted)] border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]",
  favoravel: "text-[#3B9F4F] border-[#3B9F4F]/30 bg-[#3B9F4F]/5",
  desfavoravel: "text-[#C13838] border-[#C13838]/30 bg-[#C13838]/5",
};

export const RISCO_LABEL: Record<Risco, string> = {
  verde: "Verde · Risco Baixo",
  amarelo: "Amarelo · Risco Médio",
  vermelho: "Vermelho · Alto Risco",
};

export const RISCO_DOT: Record<Risco, string> = {
  verde: "#3B9F4F",
  amarelo: "#D4A024",
  vermelho: "#C13838",
};

export const TRIBUTOS = ["ICMS", "PIS", "COFINS", "ISS", "IRPJ", "CSLL", "IPI"];
export const ESFERAS: { value: Esfera; label: string }[] = [
  { value: "federal", label: "Federal" },
  { value: "estadual", label: "Estadual" },
  { value: "municipal", label: "Municipal" },
];
export const VIAS: { value: Via; label: string }[] = [
  { value: "judicial", label: "Judicial" },
  { value: "administrativa", label: "Administrativa" },
];

export const TESES: Tese[] = [
  // ─────────── Judicial ───────────
  {
    slug: "icms-pis-cofins-tema-69",
    title: "Exclusão do ICMS da base de cálculo do PIS/COFINS",
    base: "Tema 69, STF · RE 574.706/PR",
    tributos: ["PIS", "COFINS", "ICMS"],
    status: "favoravel",
    esfera: "federal",
    via: "judicial",
    risco: "verde",
    ano: 2017,
    resumo:
      "A 'tese do século'. O STF firmou que o ICMS, por não compor faturamento, deve ser excluído da base do PIS e da COFINS. Crédito retroativo de 5 anos.",
    analise:
      "Decidida favoravelmente pelo STF em 15/03/2017 (RE 574.706/PR), com modulação de efeitos confirmada em 13/05/2021. O entendimento é que o ICMS, sendo receita repassada ao Estado, não integra o faturamento empresarial — base de cálculo do PIS e da COFINS. Aplicável a empresas do Lucro Real e Lucro Presumido. Permite recuperação retroativa dos últimos 5 anos para quem ajuizou antes de 15/03/2017, e a partir desta data para os demais. A NGT acompanha cada caso considerando o critério temporal, o regime tributário e o tipo de receita.",
  },
  {
    slug: "iss-pis-cofins-tema-118",
    title: "Exclusão do ISS da base de cálculo do PIS/COFINS",
    base: "Tema 118, STF · RE 592.616",
    tributos: ["PIS", "COFINS", "ISS"],
    status: "discussao",
    esfera: "federal",
    via: "judicial",
    risco: "amarelo",
    ano: 2023,
    resumo:
      "Tese filhote da Tema 69. STF retomou julgamento em 2023 com placar favorável ao contribuinte. Aguarda conclusão e modulação.",
    analise:
      "Por simetria à exclusão do ICMS da base do PIS/COFINS (Tema 69), discute-se a exclusão também do ISS — especialmente relevante para empresas de serviços (Lucro Real e Lucro Presumido). O julgamento foi retomado em agosto de 2023 com 6 votos favoráveis ao contribuinte, mas pendente de conclusão. Recomenda-se ajuizamento preventivo para garantir o direito de retroatividade caso haja modulação de efeitos.",
  },
  {
    slug: "pis-cofins-propria-base-tema-1067",
    title: "Exclusão do PIS/COFINS da própria base de cálculo",
    base: "Tema 1067, STF",
    tributos: ["PIS", "COFINS"],
    status: "discussao",
    esfera: "federal",
    via: "judicial",
    risco: "amarelo",
    ano: 2023,
    resumo:
      "Mais uma tese filhote. Discussão sobre a inclusão das próprias contribuições na sua base de cálculo, em violação ao conceito constitucional de receita.",
    analise:
      "O Tema 1067 discute a constitucionalidade da inclusão do PIS e da COFINS na sua própria base de cálculo. A tese tem fundamento técnico sólido e segue o raciocínio da Tema 69. Recomenda-se ajuizamento preventivo para empresas no Lucro Real e Lucro Presumido enquanto o STF não modula efeitos.",
  },
  {
    slug: "pat-deducao-irpj",
    title: "PAT — Dedução do IRPJ",
    base: "Lei 6.321/76 · Art. 1º",
    tributos: ["IRPJ"],
    status: "vigor",
    esfera: "federal",
    via: "judicial",
    risco: "verde",
    ano: 2019,
    resumo:
      "Dedução integral dos gastos com o Programa de Alimentação do Trabalhador da base do IRPJ, sem limitações impostas por instruções normativas.",
    analise:
      "A Lei 6.321/76 prevê a dedução dos gastos com PAT diretamente do imposto devido. Instruções normativas posteriores tentaram limitar essa dedução ao valor da refeição, mas o Judiciário tem afastado essa restrição. Recuperação retroativa de 5 anos para empresas que mantêm PAT regularmente registrado.",
  },
  {
    slug: "icms-iss-irpj-csll-1008",
    title: "Exclusão do ICMS/ISS da base de cálculo do IRPJ e CSLL",
    base: "Recurso Repetitivo nº 1.008, STJ",
    tributos: ["ICMS", "ISS", "IRPJ", "CSLL"],
    status: "favoravel",
    esfera: "federal",
    via: "judicial",
    risco: "amarelo",
    ano: 2024,
    resumo:
      "Discussão sobre inclusão dos tributos indiretos na base de cálculo do IRPJ e CSLL no regime do Lucro Presumido. Repetitivo no STJ.",
    analise:
      "O Recurso Repetitivo nº 1.008 do STJ trata da inclusão do ICMS e ISS na base do IRPJ e CSLL no Lucro Presumido. A análise é caso a caso e depende do perfil da operação. A NGT identifica aplicabilidade no diagnóstico inicial.",
  },
  {
    slug: "icms-tust-tusd-986",
    title: "Ilegalidade do ICMS nas faturas de energia elétrica",
    base: "Tema 986, STJ · Tema 176, STF",
    tributos: ["ICMS"],
    status: "favoravel",
    esfera: "estadual",
    via: "judicial",
    risco: "verde",
    ano: 2024,
    resumo:
      "Discussão sobre incidência de ICMS sobre TUSD/TUST e demais encargos da fatura de energia. Tese de alto potencial para indústrias e operações com consumo elevado.",
    analise:
      "O Tema 986 do STJ e o Tema 176 do STF tratam da incidência indevida de ICMS sobre encargos das faturas de energia elétrica que não configuram circulação de mercadoria (TUSD, TUST, encargos setoriais). Para empresas com alto consumo elétrico — indústria, frigoríficos, supermercados — o potencial retroativo de recuperação é significativo.",
  },
  {
    slug: "revisao-parcelamentos",
    title: "Revisão de ilegalidades em parcelamentos tributários",
    base: "Análise individual",
    tributos: ["IRPJ", "CSLL", "PIS", "COFINS"],
    status: "vigor",
    esfera: "federal",
    via: "judicial",
    risco: "amarelo",
    ano: 2024,
    resumo:
      "Revisão de parcelamentos federais com base em ilegalidades de capitalização de juros, anatocismo e cobrança de encargos indevidos.",
    analise:
      "Diversos parcelamentos federais (REFIS, PERT, PRT, etc.) contêm ilegalidades de capitalização de juros e cobrança de multas e encargos acima do permitido. A revisão pode resultar em devolução de valores pagos a maior ou abatimento do saldo devedor.",
  },
  {
    slug: "contribuicoes-verbas-indenizatorias",
    title: "Contribuições previdenciárias sobre verbas indenizatórias",
    base: "Jurisprudência consolidada",
    tributos: ["IRPJ", "CSLL"],
    status: "favoravel",
    esfera: "federal",
  
  via: "judicial",
    risco: "verde",
    ano: 2022,
    resumo:
      "Afastamento da incidência de contribuição previdenciária patronal sobre verbas indenizatórias (aviso prévio, terço de férias, auxílio-doença etc).",
    analise:
      "Tese consolidada na jurisprudência. Verbas pagas ao empregado com natureza indenizatória — e não remuneratória — não devem compor a base de contribuição previdenciária patronal. Inclui aviso prévio indenizado, 15 primeiros dias de auxílio-doença, terço constitucional de férias, entre outros. Recuperação retroativa de 5 anos.",
  },
  {
    slug: "acesso-sincor",
    title: "Acesso ao SINCOR",
    base: "Mandado de segurança",
    tributos: ["IRPJ", "CSLL"],
    status: "vigor",
    esfera: "federal",
    via: "judicial",
    risco: "amarelo",
    ano: 2023,
    resumo:
      "Ação para garantir acesso da empresa ao Sistema de Conta Corrente Fiscal da Receita Federal e identificar créditos não computados.",
    analise:
      "O SINCOR (Sistema de Conta Corrente) da Receita Federal frequentemente contém créditos não aproveitados ou compensações não computadas. Via mandado de segurança, é possível obter acesso integral à conta corrente fiscal e identificar saldo a recuperar.",
  },
  {
    slug: "20-salarios-1079",
    title: "Limitação de 20 salários-mínimos — contribuições a terceiros",
    base: "Tema 1.079, STJ",
    tributos: ["IRPJ", "CSLL"],
    status: "discussao",
    esfera: "federal",
    via: "judicial",
    risco: "amarelo",
    ano: 2023,
    resumo:
      "Discussão sobre limitação da base de cálculo das contribuições destinadas a terceiras entidades (Sistema S, INCRA, Salário-Educação) a 20 salários-mínimos.",
    analise:
      "O Tema 1.079 do STJ trata da aplicação do limite de 20 salários-mínimos na base de cálculo das contribuições destinadas a terceiros (SESI, SENAI, SESC, SENAC, SEBRAE, INCRA, Salário-Educação). A jurisprudência tem sido favorável em muitas situações, mas a aplicabilidade depende do regime e do volume de folha.",
  },
  {
    slug: "bonificacoes-icms",
    title: "Exclusão de bonificações da base do ICMS",
    base: "Jurisprudência",
    tributos: ["ICMS"],
    status: "favoravel",
    esfera: "estadual",
    via: "judicial",
    risco: "amarelo",
    ano: 2022,
    resumo:
      "Bonificações comerciais (mercadorias dadas gratuitamente ao cliente) não devem compor a base de cálculo do ICMS por não representarem operação onerosa.",
    analise:
      "Bonificações comerciais em mercadorias — quando entregues sem cobrança específica — não configuram circulação onerosa e, portanto, não devem incluir-se na base de cálculo do ICMS. A tese é especialmente relevante para indústria e atacado com política comercial agressiva.",
  },
  {
    slug: "ipi-zona-franca-322",
    title: "Créditos de IPI sobre insumos da Zona Franca de Manaus",
    base: "Tema 322, STF",
    tributos: ["IPI"],
    status: "favoravel",
    esfera: "federal",
    via: "judicial",
    risco: "verde",
    ano: 2020,
    resumo:
      "Direito ao crédito de IPI na aquisição de insumos provenientes da Zona Franca de Manaus e Área de Livre Comércio, ainda que isentos na origem.",
    analise:
      "O STF, no Tema 322, firmou o direito ao creditamento de IPI sobre insumos adquiridos da Zona Franca de Manaus e Áreas de Livre Comércio, mesmo quando isentos na operação anterior — em nome do princípio da não-cumulatividade. Tese relevante para indústrias com cadeia de suprimento envolvendo a ZFM.",
  },
  {
    slug: "pis-cofins-monofasico",
    title: "Créditos de PIS/COFINS sobre produtos de regime monofásico",
    base: "Via administrativa · PER/DCOMP",
    tributos: ["PIS", "COFINS"],
    status: "vigor",
    esfera: "federal",
    via: "administrativa",
    risco: "verde",
    ano: 2023,
    resumo:
      "Recuperação direta na via administrativa de créditos pagos a maior em PIS/COFINS sobre produtos do regime monofásico.",
    analise:
      "Empresas que comercializam produtos sujeitos ao regime monofásico de PIS/COFINS (medicamentos, cosméticos, combustíveis, autopeças, bebidas) frequentemente pagam tributo de forma indevida na revenda. A recuperação se faz via PER/DCOMP, com baixa complexidade e prazo reduzido.",
  },
  {
    slug: "lc-160-2017",
    title: "Lei Complementar 160/2017 — créditos presumidos de ICMS",
    base: "LC 160/2017",
    tributos: ["IRPJ", "CSLL", "ICMS"],
    status: "vigor",
    esfera: "federal",
    via: "administrativa",
    risco: "verde",
    ano: 2017,
    resumo:
      "Aproveitamento dos benefícios da LC 160/2017, que reclassificou créditos presumidos de ICMS como subvenção para investimento — fora da base do IRPJ/CSLL.",
    analise:
      "A LC 160/2017 trouxe segurança jurídica ao tratamento dos créditos presumidos de ICMS como subvenção para investimento, afastando sua incidência na base do IRPJ e CSLL. A NGT auxilia na correta apuração e aproveitamento desses créditos, com potencial significativo para indústrias instaladas em estados com benefícios fiscais.",
  },
  {
    slug: "sistema-apuracao",
    title: "Auditoria do sistema de apuração",
    base: "Análise documental",
    tributos: ["PIS", "COFINS", "IRPJ", "CSLL"],
    status: "vigor",
    esfera: "federal",
    via: "administrativa",
    risco: "verde",
    ano: 2024,
    resumo:
      "Cruzamento sistemático de obrigações acessórias com registros contábeis para identificar créditos não aproveitados nos últimos 60 meses.",
    analise:
      "Auditoria técnica do sistema de apuração da empresa: cruzamento de EFD-Contribuições, EFD-ICMS/IPI, DCTF, ECF e registros contábeis. Identifica créditos não computados, classificações fiscais incorretas e oportunidades de revisão. Recuperação imediata via retificação e PER/DCOMP.",
  },
  {
    slug: "pis-cofins-insumos-779",
    title: "Créditos de PIS/COFINS sobre insumos — Tema 779",
    base: "Tema 779, STJ · REsp 1.221.170",
    tributos: ["PIS", "COFINS"],
    status: "vigor",
    esfera: "federal",
    via: "administrativa",
    risco: "verde",
    ano: 2018,
    resumo:
      "STJ adotou o critério de essencialidade e relevância para definir insumos creditáveis de PIS/COFINS — conceito muito mais amplo que o restritivo da Receita.",
    analise:
      "O STJ firmou que o conceito de insumo para creditamento de PIS/COFINS deve ser apurado à luz dos critérios de essencialidade e relevância para a atividade econômica. Isso permite o crédito sobre uma gama muito maior de despesas — equipamentos de segurança, materiais de manutenção, frete, embalagens e outros itens essenciais. A análise é caso a caso e depende do escopo operacional.",
  },
];
