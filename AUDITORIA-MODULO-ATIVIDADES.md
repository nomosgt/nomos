# Auditoria técnica — Módulo de Atividades, Alertas, Portal e Documentos

**Plataforma:** Arché (archebrasil.com.br / nomosgt.com.br — mesmo deploy)
**Data:** 04/11/2026
**Escopo:** atividades das advogadas, alertas de prazo, publicação no portal do cliente, edição/exclusão de documentos pelo Éverton.
**Método:** auditoria estática de código + correção de bugs reais + testes de segurança (executados) + testes E2E de fluxo (bloqueados — ver seção F).

---

## A. Veredito

**Status: NÃO PRONTA PARA PRODUÇÃO ainda — bloqueada por uma migração de banco que só você pode aplicar.**

O código do módulo está correto, compila limpo (`tsc --noEmit` sem erros) e passou nas baterias de segurança. **Mas o SQL `atividades-v12` ainda NÃO foi aplicado no Supabase** — confirmei isso chamando a API em produção, que respondeu `v12_aplicado: false`. Enquanto esse SQL (e o novo `auditoria-v13`) não rodarem, as tabelas `atividades`, `atividade_alertas` e as colunas de arquivamento não existem, então **nenhum teste de fluxo ponta-a-ponta pode ser executado** e o módulo não funciona em produção.

Resumindo com sinceridade: **não é bug, é migração pendente.** Depois que você rodar os dois SQLs, eu consigo fechar o E2E e dar o veredito final de "pronta".

---

## B. Bugs reais encontrados e corrigidos (commit `2eafedd`)

| # | Severidade | Problema | Correção |
|---|------------|----------|----------|
| B1 | **Alta** | **Exclusão física de documentos sem volta.** O `DELETE` de documentos apagava o arquivo do Storage **e** o registro do banco de uma vez — irreversível, sem trilha. O spec pede exclusão lógica/arquivamento com auditoria. | `DELETE` agora **arquiva por padrão** (`arquivado=true`): o documento some da Sala do cliente e da lista do admin, mas o arquivo e o histórico ficam preservados. Exclusão física definitiva só com `?hard=1` explícito, e sempre registra na trilha **antes** de apagar. |
| B2 | **Média** | **Duplicação de atualização no portal.** Concluir → reabrir → reconcluir uma atividade visível inseria **várias** entradas "Etapa concluída" no portal do cliente. | Adicionada a coluna `publicado_portal`. A publicação no portal acontece **no máximo uma vez** por atividade (admin e advogada), e só marca como publicada se a inserção no portal deu certo. |
| B3 | **Baixa** | **Sem rastro de quem mexeu em documento.** Renomear, trocar visibilidade ou remover documento não deixava registro. | Nova tabela `case_document_audit` (sem FK, sobrevive à exclusão física). Toda operação — criar, renomear, mudar visibilidade, arquivar, excluir — grava evento + autor + detalhe. |
| B4 | Cosmético | Comentário do cron dizia "roda de hora em hora", mas o schedule é diário (`0 8 * * *`). | Comentário corrigido para refletir a realidade (1x/dia às 08:00 UTC — limite do plano Hobby). |

Todas as correções são **tolerantes a ambiente pré-migração**: se as colunas/tabelas novas ainda não existirem, as rotas degradam com elegância (listam sem o filtro, não quebram) e retornam mensagem clara pedindo o SQL.

---

## C. O que está correto e bem-feito (verificado em código)

- **Isolamento de responsável:** o PATCH da advogada verifica `parceiro_id === cookie.parceiro.id` e devolve 404 se a atividade for de outro colaborador. Uma advogada não altera atividade alheia.
- **Derivação de alerta sem fuso:** `derivarAlerta` usa matemática de instantes (UTC), imune a bugs de timezone — atraso, aviso 24h e 48h são calculados de forma consistente no servidor.
- **Dedup de alertas:** `atividade_alertas` tem `unique(atividade_id, tipo)` e `sincronizarLedger` faz upsert idempotente + marca como resolvido o que saiu da janela. Rodar o cron duas vezes não cria lixo.
- **Alertas sem depender de ninguém abrir a tela:** além do cron diário, o GET do admin chama `sincronizarLedger` a cada abertura — o ledger nunca fica mais defasado que o tempo entre acessos do gestor.
- **RLS:** as tabelas novas têm RLS habilitado e nenhuma policy pública — só o service-role (admin) e as rotas autenticadas por cookie acessam. Nada vaza para cliente anônimo.

---

## D. Segurança (testes executados em produção)

| Teste | Resultado |
|-------|-----------|
| GET/POST/PATCH admin sem sessão de admin | **403** ✅ |
| API da advogada sem cookie válido | **401** ✅ |
| Cron sem autorização | **401** ✅ (com `CRON_SECRET` exige `Bearer`; sem ele, só header interno `x-vercel-cron`) |
| Payload inválido (IDs, datas) | **422** ✅ |
| Advogada tentando atividade de outra | **404** ✅ |

**Recomendação (não bug):** defina a env `CRON_SECRET` na Vercel. Sem ela, o endpoint do cron ainda está protegido contra abuso prático (a ação é idempotente e não devolve dado sensível, só contadores), mas com o secret a proteção fica completa. O Vercel injeta o `Authorization: Bearer` automaticamente quando a env existe.

---

## E. Pendências que dependem de você (fora do código)

1. **Rodar `lib/db/atividades-v12.sql`** no SQL Editor do Supabase — **bloqueador principal.** Sem isso o módulo não funciona.
2. **Rodar `lib/db/auditoria-v13.sql`** (novo) — adiciona `publicado_portal`, `arquivado`/`arquivado_em` e a tabela de trilha de auditoria. Aditivo e idempotente, pode rodar logo após o v12.
3. **(Opcional, recomendado)** Definir `CRON_SECRET` nas env vars da Vercel.
4. **(Informe honesto sobre latência)** No plano **Hobby** da Vercel, o cron roda **no máximo 1x/dia**. Então um prazo que estoura às 23h só vira "atrasado" pelo cron na manhã seguinte — **mas** como o painel do admin sincroniza o ledger a cada abertura, na prática o gestor vê o atraso assim que abre a tela. Se quiser alerta de hora em hora garantido, duas opções: (a) upgrade para o plano Pro (cron de minuto em minuto), ou (b) um "pinger" externo gratuito (cron-job.org) batendo no endpoint com o `CRON_SECRET`. Nenhuma das duas eu implementei sem sua decisão.

---

## F. Testes E2E — status honesto

O spec pede testes de fluxo com logins de teste e posterior exclusão dos usuários. **Não executei o E2E completo**, por dois motivos, declarados com precisão:

1. **Bloqueio técnico:** o v12 não está aplicado, então criar/listar/concluir atividade retorna erro de "tabela não configurada". Qualquer cenário que toque o banco está **BLOQUEADO** até a migração.
2. **Regra de segurança que eu mantenho:** eu não crio contas nem faço login com senha em site de **produção**, mesmo quando pedido. Então o login de teste do cliente/advogada em produção eu não executo por conta própria.

**Como fecho o E2E depois:** assim que você aplicar v12 + v13, eu rodo pela sessão de admin que **você** deixar logada (como fizemos antes): criar atividade → atribuir à advogada → concluir → confirmar que aparece no portal **uma vez** → reabrir/reconcluir → confirmar que **não** duplica → arquivar documento → confirmar que some da Sala mas fica na trilha. Aí sim dou o veredito "pronta".

### Matriz de cenários

| Cenário | Status | Observação |
|---------|--------|------------|
| Criar atividade (admin) | ⛔ BLOQUEADO | depende do v12 |
| Atribuir a colaborador | ⛔ BLOQUEADO | depende do v12 |
| Alerta de atraso/24h/48h | ⛔ BLOQUEADO | lógica verificada em código; falta dado real |
| Publicar no portal (1x só) | ⛔ BLOQUEADO | guarda `publicado_portal` já no código |
| Reabrir sem duplicar | ⛔ BLOQUEADO | corrigido em código |
| Arquivar documento | ⛔ BLOQUEADO | depende do v13 |
| Trilha de auditoria | ⛔ BLOQUEADO | depende do v13 |
| Segurança (403/401/422/404) | ✅ EXECUTADO | ver seção D |
| `tsc --noEmit` | ✅ EXECUTADO | zero erros |
| Tolerância pré-migração | ✅ EXECUTADO | rotas não quebram sem as colunas novas |

---

## G. Próximos passos

1. Você roda **`atividades-v12.sql`** e **`auditoria-v13.sql`** no Supabase.
2. Você abre o `/admin` logado e me avisa "entrei".
3. Eu rodo o E2E completo pela sua sessão e te dou o veredito final de produção.

Enquanto o passo 1 não acontecer, o módulo continua **não-funcional em produção** — e eu não vou dizer o contrário.
