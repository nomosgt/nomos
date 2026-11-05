# Matriz de Conformidade — Sala Arché (vídeo × plataforma)

**Data:** 05/11/2026 · **Método:** auditoria do repositório existente contra os elementos demonstrados no vídeo. Legenda: ✅ **Existe e funciona** · 🟡 **Parcial** (existe mas mais simples que o vídeo) · 🆕 **Implementado agora** (anexos) · ⛔ **Falta**.

> Nota: os dados do vídeo (Marina, Vertente Alimentos, Rafael Moura, valores) são fictícios e **não** foram cadastrados. A matriz avalia funcionalidade, não os dados de exemplo.

| # | Elemento do vídeo | Estado | Observação / o que falta |
|---|-------------------|--------|--------------------------|
| **Login & ambiente** | | | |
| 4.1 | Tela de login da Sala (e-mail/senha, erros, sessão, logout, rotas protegidas) | ✅ | `app/sala/login`, middleware guarda `/sala`. |
| 4.2 | "Como você quer entrar?" (Sala / Parceiro / Admin) | ✅ | `app/acesso/page.tsx` com os 3 cards e roteamento. |
| **Dashboard** | | | |
| 5.1 | Card Caixa recuperado (R$, pt-BR) | ✅ | Hero no `app/sala/page.tsx`, lê `caixa_recuperado_total`. |
| 5.2 | Potencial identificado | 🟡 | Mostrado **por caso** (potencial_estimado); falta o card agregado "potencial total" no topo. |
| 5.3 | Casos ativos (contadores) | ✅ | "Casos em andamento / concluídos" via view. |
| 5.4 | Aprovações pendentes (contador no topo) | 🟡 | A página de Aprovações existe; falta o **badge/contador** no dashboard. |
| 5.5 | Indicador "atualizado há Xs" | ⛔ | Não existe; recomendo "última sincronização: <hora>" (sem fingir realtime). |
| **Meus casos** | | | |
| 6 | Lista de casos, etapa, barra de progresso, potencial/recuperado | ✅ | Timeline de 7 etapas + valores por caso. |
| **Detalhe do caso** | | | |
| 7.1 | Fluxo de 7 etapas com estados (concluído/atual/futuro) | ✅ | `ETAPA_LABEL` + render por `etapa`. |
| 7.2 | Linha do tempo de eventos | 🟡 | "Últimas atualizações" (case_updates) cobre isso; é **manual** (admin posta), não um feed automático de eventos do sistema. |
| 7.3 | Financeiro do caso (crédito/período/potencial/recuperado) | 🟡 | Potencial e recuperado existem; **período de apuração** e "crédito apurado" não são campos próprios. |
| 7.4 | Documentos do caso | ✅ | Aba Documentos + `case_documents` com arquivamento/auditoria (v13). |
| **Aprovações** | | | |
| 8.1–8.3 | Página de autorização com detalhes ricos (valor, tributos, período, modalidade, honorários, risco, anexos) | 🟡 | Existe aprovação (título + corpo + status), ownership e idempotência (409 se já respondida). **Faltam os campos estruturados** do vídeo. |
| 8.4 | Modal "Confirmar aprovação" + checkbox "li o parecer" | ⛔ | Hoje é aprovar/recusar direto com comentário. Falta o modal de confirmação com ciência. |
| 8.5 | Tela de sucesso com **protocolo** de aprovação | 🟡 | Registra decisão + data/hora; falta o número de **protocolo** visível. |
| 8.6 | "Solicitar ajuste" (distinto de recusar) | ⛔ | Hoje só "recusar" com comentário. Falta o fluxo próprio de revisão. |
| **Documentos** | | | |
| 9 | Central de documentos, por caso, download seguro, auditoria | ✅ | URL assinada, RLS por cliente, arquivamento lógico + trilha (v13). |
| 9 | Anexos vindos de **atividades/tarefas** aparecendo pro cliente | 🆕 | **Implementado agora** (v14): anexo em atividade com visibilidade cliente/interno; visível+com caso espelha em Documentos + avisa o cliente. |
| **Mensagens** | | | |
| 10 | Chat cliente ↔ consultor, persistência, anexos | 🟡 | Chat existe (`mensagens-chat`, `case_messages`); **anexos na mensagem** e presença "online" real não. (Vídeo mostra anexo no chat.) |
| **Atividade recente** | | | |
| 11 | Feed "Acontecendo agora" automático | 🟡 | Coberto por "Últimas atualizações" (manual). Feed automático de eventos do sistema não existe. |
| **Financeiro** | | | |
| 12 | Distinção potencial / apurado / em compensação / recuperado; sem dupla contagem | 🟡 | Potencial e recuperado separados e editáveis no admin (anti-duplicação de publicação já tratada). Faltam os estágios intermediários "apurado" e "em compensação". |
| **Admin & Parceiros** | | | |
| 13 | Ambientes admin e parceiro que alimentam a Sala | ✅ | Admin gere casos/etapas/documentos/aprovações/mensagens/atividades; parceiro tem central própria. |
| **Segurança** | | | |
| 15 | RLS, isolamento multitenant, autorização no backend | ✅ | Validado ao vivo (403/401/404/422, isolamento entre colaboradores). Anexos internos nunca expostos ao cliente (não espelham em `case_documents`). |

---

## Resumo

- **✅ Já existia e funciona:** login, seleção de ambiente, dashboard base, casos + 7 etapas, documentos com download seguro/auditoria, aprovação com idempotência e ownership, admin/parceiro que alimentam a Sala, segurança/isolamento.
- **🆕 Implementado agora:** **anexos em atividades** (admin + advogada), visibilidade por arquivo, espelho em Documentos + aviso único ao cliente, arquivamento + auditoria, sem duplicar arquivo físico. *(Depende da migração v14 — te passei o SQL.)*
- **🟡 Parcial (existe, mais simples que o vídeo):** card de potencial agregado, badge de aprovações no dashboard, timeline automática, campos financeiros do caso (período/apurado), aprovação com campos ricos + protocolo, anexos no chat, feed "acontecendo agora" automático.
- **⛔ Falta:** modal de confirmação "li o parecer", fluxo "solicitar ajuste" separado, indicador "atualizado há Xs".

## Próximos incrementos sugeridos (ordem)

1. **Aprovações ricas** (P1, maior impacto no vídeo): campos estruturados (valor/tributos/período/modalidade/honorários/risco/anexos), modal de confirmação com ciência, protocolo, e "solicitar ajuste" como fluxo próprio.
2. **Anexos no chat** de mensagens (reusa o mesmo bucket + padrão de visibilidade).
3. **Dashboard:** card de potencial agregado + badge de aprovações pendentes + "última sincronização".
4. **Timeline/feed** derivado de eventos reais (conclusão de etapa, documento publicado, aprovação) — sem inventar acontecimentos.

**Nada aqui é declarado "testado em produção" além do que já validei ao vivo.** Os anexos (v14) eu testo ponta a ponta assim que você rodar a migração.
