# Plano E2E de Homologação — Arché

Executado contra o **deploy de homologação** (nunca produção), com os dados fictícios do seed. Cada teste tem critério objetivo: **PASS** só quando o critério é verificado; caso contrário **FAIL** (com evidência) ou **BLOQUEADO** (com motivo).

## Convenções
- `ADMIN` = sessão do usuário admin de homolog. `CLIENTE` = sessão do cliente fictício. `ADV` = colaborador de teste (código gerado no próprio teste).
- Toda massa criada nos testes usa prefixo `[HOMOLOG]` e é removida ao final (ou permanece no projeto de homolog, que é descartável).

| # | Fluxo | Passos | Critério de PASS |
|---|-------|--------|------------------|
| 1 | Cadastro do cliente | ADMIN edita razão social, fantasia, CNPJ válido, contato, consultor | PATCH 200; recarregar mostra os valores; `client_profile_audit` tem 1 linha por campo (de/para/autor); CNPJ inválido antes disso → 422 |
| 2 | Caso: criar/editar | ADMIN cria caso novo e edita título/tese/descrição/responsável/período | 200; valores persistem após reload; `case_audit` registra cada campo |
| 3 | Etapa → timeline | ADMIN muda etapa 1→4 | `case_updates` ganha **exatamente 1** evento "Etapa atualizada"; Sala do CLIENTE mostra barra em 4/7 e o evento; repetir o mesmo valor **não** gera 2º evento |
| 4 | Lançamento financeiro | ADMIN lança `recuperado` R$ 10.000 | resposta `{ok, atomico:true}` (RPC v21 ativo); `valor_recuperado` do caso = 10.000; `caixa_recuperado_total` do cliente = 10.000; dashboard do CLIENTE exibe R$ 10.000 |
| 5 | Ajuste com justificativa | ADMIN lança `ajuste` −R$ 1.000 alvo `recuperado`, justificado | total recuperado = 9.000 em todos os pontos do item 4; sem justificativa → 422; sem estágio → 422 |
| 6 | Sincronização/idempotência | repetir GET + reconciliação manual | totais idênticos (recompute não duplica); 2 lançamentos iguais criam 2 linhas distintas no livro (não é dedupe silencioso) e o total = soma |
| 7 | Upload + versionamento | ADMIN sobe PDF `[HOMOLOG]`, substitui por v2 | lista mostra v2 ativa; v1 arquivada e encadeada (`substituido_por`); histórico lista v1 com download íntegro; substituir v1 de novo → 409 |
| 8 | Arquivar/restaurar/publicar | arquivar doc, restaurar, alternar interno↔cliente | arquivado some da lista ativa e da Sala; restaurar volta; publicar gera **1** aviso na Sala; doc interno **nunca** aparece na Sala nem baixa pela rota do cliente (404) |
| 9 | Aprovação enriquecida | ADMIN cria com valor/tributos/risco/prazo/anexos | CLIENTE vê todos os campos e anexos na Sala |
| 10 | Termos + protocolo | CLIENTE aprova com checkbox | sem checkbox → 422; com → status aprovada, `protocolo ARQ-…` persistido e exibido, `termos_versao` + `termos_aceitos_em` gravados; timeline ganha 1 evento; 2ª tentativa → 409 |
| 11 | Ajuste + reapresentação | CLIENTE solicita ajuste; ADMIN reapresenta | status `ajuste_solicitado` com motivo; reapresentar → `pendente` revisão+1; aprovar na revisão gera novo protocolo |
| 12 | Chat com anexos | ADMIN envia msg+arquivo; CLIENTE responde+arquivo | ambos veem as mensagens e baixam os anexos; download de anexo alheio (outra empresa) → 404 |
| 13 | Reflexo na Sala | revisar dashboard do CLIENTE após 1–12 | caixa, potencial, badge de aprovações, última atualização e timeline coerentes com as ações, sem duplicatas |
| 14 | Isolamento | criar 2º cliente fictício; CLIENTE A tenta recursos de B | toda rota de leitura/escrita cruzada → 404/403; listas não vazam |
| 15 | Permissões | ADV (código) tenta rotas financeiras/cadastrais/casos | 401/403 em todas; ADV só acessa as próprias atividades/anexos |

## Central de Comando · Colaboradores (v23)

| # | Fluxo | Passos | Critério de PASS |
|---|-------|--------|------------------|
| 16 | Central consolidada | ADMIN abre /admin/colaboradores | cards (colaboradores/abertas/prazos 7d/atrasadas/revisão/concluídas 30d) batem com contagem manual das atividades do banco; agenda lista atrasadas/hoje/semana corretas |
| 17 | Perfil expansível | clicar num colaborador | expande com tarefas, histórico real (atividade_historico), indicadores (no prazo/fora/tempo médio) e casos vinculados; colaborador sem dados mostra "dados insuficientes", não zero inventado |
| 18 | Nova tarefa via perfil | botão "+ Nova tarefa/deadline" | abre /admin/atividades com modal pré-selecionado no colaborador; salvar → tarefa aparece na Central do colaborador e nas stats do perfil |
| 19 | Aguardando revisão | ADV clica "Enviar p/ revisão" | status `aguardando_revisao` persiste; badge amarelo no admin; contador "Revisão" sobe; histórico registra a transição; ADV **não** consegue `cancelada` (422) |
| 20 | Cancelar (só admin) | ADMIN cancela uma tarefa | status `cancelada`; some de "abertas" do colaborador; histórico registra; indicadores não contam cancelada como concluída |

## Análises técnicas e Inteligência Empresarial (v23/v24)

| # | Fluxo | Critério de PASS |
|---|-------|------------------|
| 21 | Criar análise (ADV) | registro persistido vinculado a tarefa/empresa; rascunho visível só ao autor e ao admin |
| 22 | Enviar p/ revisão | status `enviada`; aparece em /admin/analises; evento único em `analise_eventos`; admin vê conteúdo+anexos |
| 23 | Solicitar ajustes | sem comentário → 422; com → status `ajustes_solicitados`, colaborador vê o comentário e volta a poder editar |
| 24 | Reenvio/versionamento | corrigir e reenviar → `enviada` com versao+1; evento `reenviada`; histórico preservado |
| 25 | Aprovação | status `aprovada` + revisada_por/em; análise fica **imutável** p/ colaborador (PATCH → 409); 2ª decisão simultânea → 409 |
| 26 | Faturamento | registrar faturamento mensal c/ período → persiste; nasce **não validado**; registro idêntico duplicado → 409 |
| 27 | Correção empresarial | corrigir valor sem justificativa → 422; com → novo valor + `empresa_dados_audit` com anterior; **caixa recuperado inalterado** |
| 28 | Isolamento análises | ADV tenta análise/empresa de outro → 404/403; anexo alheio → 404 |
| 29 | Navegação integrada | colaborador → tarefa → análise → empresa navegáveis e consistentes |
| 30 | Concorrência | aprovar + solicitar ajustes simultâneos na mesma análise → uma decisão vence, outra recebe 409; estado final único |

## Central de Comando 2.0 — fechamento (v25)

| # | Fluxo | Critério de PASS |
|---|-------|------------------|
| 31 | Notificações internas | enviar análise → aviso ao admin; ajustes/aprovação → aviso ao colaborador; nova tarefa/prazo → aviso ao colaborador; **reemitir o mesmo evento não duplica** (dedup_key); marcar lida persiste; colaborador não lê aviso alheio |
| 32 | Painel de Empresas | /admin/empresas lista todas; faturamento mostra último período com origem/validação ou "Sem dados" (nunca zero fictício); contadores batem; navegação ao detalhe funciona; sem mistura com recuperação tributária |
| 33 | Snapshot de versão | admin solicita ajustes → cria snapshot arquivado da versão revisada (encadeado); colaborador edita e reenvia (rev+1); admin consulta a versão revisada anterior **com o conteúdo original intacto** |

## Pós-execução
- Registrar PASS/FAIL com evidência (status + corpo da resposta) por item.
- Defeitos P0/P1 encontrados → corrigir, redeployar homolog, reexecutar o item.
- Só após 1–15 verdes a Arché pode ser classificada **CONCLUÍDA E HOMOLOGADA** (produção segue intocada; promoção = mesma base de código já em produção + migrações já aplicadas lá).
