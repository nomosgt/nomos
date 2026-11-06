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

## Pós-execução
- Registrar PASS/FAIL com evidência (status + corpo da resposta) por item.
- Defeitos P0/P1 encontrados → corrigir, redeployar homolog, reexecutar o item.
- Só após 1–15 verdes a Arché pode ser classificada **CONCLUÍDA E HOMOLOGADA** (produção segue intocada; promoção = mesma base de código já em produção + migrações já aplicadas lá).
