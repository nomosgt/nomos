"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Container } from "@/components/ui/section";

const FAQ_ITEMS = [
  {
    q: "Como funciona o pagamento por resultado?",
    a: "O contrato prevê honorário variável atrelado ao caixa efetivamente recuperado ou ao crédito homologado pela Receita. Você não paga nada antecipado, nem retainer mensal, nem 'taxa de análise'. Se a tese não voltar resultado, não há cobrança. O percentual exato varia por complexidade — definido após o diagnóstico inicial, antes da assinatura.",
  },
  {
    q: "Quanto tempo leva da reunião inicial até o caixa chegar?",
    a: "Depende da via: créditos administrativos via PER/DCOMP entregam caixa em 6 a 12 meses; teses judiciais consolidadas (com decisões transitadas em julgado) em 12 a 18 meses; teses em discussão ainda no STF/STJ podem levar 24 a 36 meses, mas o ajuizamento preventivo já trava o direito retroativo. O cronograma exato é apresentado na Etapa 05 da jornada.",
  },
  {
    q: "A NGT só trabalha com empresas grandes?",
    a: "Não. O discurso institucional é deliberadamente inclusivo: atendemos do médio porte (R$ 10M de faturamento) ao grande (R$ 500M+). Empresas menores muitas vezes têm potencial relativo maior, porque historicamente foram menos auditadas. O que importa é o perfil tributário, não o tamanho absoluto.",
  },
  {
    q: "Vocês concorrem com a contabilidade ou complementam?",
    a: "Complementamos. O contador cuida da operação diária; a NGT atua nas teses, recuperações e contingências que exigem leitura jurídica especializada. Trabalhamos em parceria com a contabilidade do cliente — em muitos casos, é o próprio contador que indica a NGT quando identifica oportunidade fora do escopo dele.",
  },
  {
    q: "Como vocês garantem que a tese vai vencer?",
    a: "Não garantimos — ninguém pode. O que garantimos é classificação honesta de risco (verde / amarelo / vermelho) antes de qualquer ajuizamento. Teses verdes têm decisão consolidada e baixo risco; amarelas têm jurisprudência favorável mas pendente de pacificação; vermelhas só são executadas com aprovação explícita do cliente e ciência do risco. Sem aventura.",
  },
  {
    q: "E se a Receita autuar a empresa depois?",
    a: "A defesa em qualquer auto de infração relacionado às teses executadas pela NGT está incluída no escopo, sem custo adicional. Esse é o nosso skin in the game: se a leitura técnica que aplicamos for questionada, somos nós que defendemos.",
  },
  {
    q: "Vocês operam em todo o Brasil?",
    a: "Sim. Sede em São Paulo, atuação nacional. Ações judiciais em qualquer vara federal ou estadual via parceria local quando necessário. Recuperações administrativas são integralmente conduzidas remotamente. Para CFOs em SP, oferecemos reuniões presenciais.",
  },
  {
    q: "Como começa o processo?",
    a: "Uma reunião preliminar de 45 minutos, sem custo e sem compromisso. Você apresenta o regime tributário, faturamento aproximado e os incômodos atuais. Devolvemos uma leitura honesta: se faz sentido seguir ou não. Se sim, NDA na sequência e começamos a Etapa 02 da jornada.",
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="py-28 lg:py-40 border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)] mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-[color:var(--color-brand)]" />
              Perguntas frequentes
            </div>
            <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight">
              O que CFOs<br />
              <span className="italic text-[color:var(--color-brand)]">
                perguntam antes
              </span><br />
              de assinar.
            </h2>
            <p className="mt-8 text-[15px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-sm">
              Respostas diretas às oito dúvidas mais comuns na primeira
              conversa.
            </p>
          </div>

          <div className="divide-y divide-[color:var(--color-hairline)] border-t border-[color:var(--color-hairline)]">
            {FAQ_ITEMS.map((item, i) => {
              const open = openIdx === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpenIdx(open ? null : i)}
                    className="w-full flex items-start justify-between gap-6 py-8 text-left group"
                  >
                    <div className="flex items-start gap-5 lg:gap-6">
                      <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mt-1.5 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-serif text-xl lg:text-2xl leading-[1.25] tracking-tight text-[color:var(--color-ink)] transition-colors group-hover:text-[color:var(--color-brand-dim)]">
                        {item.q}
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: open ? 45 : 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="shrink-0 mt-1"
                    >
                      <Plus
                        className="w-5 h-5 text-[color:var(--color-ink)]"
                        strokeWidth={1.4}
                      />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pl-[3.25rem] lg:pl-[3.5rem] pb-8 pr-8">
                          <p className="text-[15px] lg:text-[16px] leading-[1.7] text-[color:var(--color-ink-muted)] max-w-2xl">
                            {item.a}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
// end of FAQ
