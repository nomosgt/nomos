# Homologação Arché — o que depende de você (≈20 min, tudo no plano grátis)

Produção **não** é tocada em nenhum passo. Nada aqui é pago.

## Passo 1 — Projeto Supabase novo (grátis)
1. supabase.com → **New project** (ex.: `arche-homolog`, região São Paulo).
2. SQL Editor → cole e rode **`homologacao/01-setup-homologacao.sql`** inteiro (idempotente; cria as 30 tabelas, buckets `case-documents` e `parceiros`, RLS e a função `financeiro_lancar`).

## Passo 2 — Dois usuários fictícios (no Dashboard, não em produção)
Authentication → **Add user** (e-mails fictícios que só você controla; senhas suas):
- `admin@homolog.local` → copie o UUID
- `cliente@homolog.local` → copie o UUID

## Passo 3 — Seed
Abra **`homologacao/02-seed-homologacao.sql`**, substitua `<<ADMIN_UUID>>` e `<<CLIENTE_UUID>>` pelos UUIDs copiados e rode no SQL Editor. Deve terminar em `seed homologacao ok`.

## Passo 4 — Deploy de homologação na Vercel (grátis)
1. No repositório, crie a branch `homolog` a partir da `main` (`git checkout -b homolog && git push origin homolog`). A Vercel gera um **Preview Deployment** próprio.
2. Vercel → Settings → **Environment Variables** → escopo **Preview** (branch `homolog`): preencha conforme **`homologacao/.env.homologacao.example`** — URL/keys do projeto **de homolog**, salts **novos**, e **sem** `RESEND_API_KEY` (e-mails viram no-op: nenhum destinatário real recebe nada).
3. Redeploy da branch.

## Passo 5 — Me passar o bastão
Me envie a **URL do preview** e faça login no `/admin` dele com `admin@homolog.local`. A partir daí eu executo o **PLANO-E2E.md** completo (15 fluxos), corrijo o que falhar e entrego a matriz PASS/FAIL final.

### Garantias desta configuração
- Banco, Storage, usuários e segredos 100% separados da produção.
- Dados exclusivamente fictícios (`[HOMOLOG]`).
- Sem e-mail real (Resend no-op), sem cron em preview, sem recursos pagos.
- Produção continua rodando na `main`, intocada.
