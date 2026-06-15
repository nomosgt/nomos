# Backend NGT — Setup completo

Stack: **Supabase** (Postgres + Auth + RLS) + **Next.js 15** + **Resend** (email opcional) + **Upstash Redis** (rate limit opcional).

---

## 1. Provisionar Supabase

### a. Criar projeto
1. Acesse https://supabase.com/dashboard
2. **New project** → escolha região **South America (São Paulo)**
3. Defina senha forte do banco (guarde no 1Password)
4. Aguarde ~2 min até o projeto ficar `Active`

### b. Pegar as chaves
1. Supabase Dashboard → **Project Settings** → **API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ NUNCA exponha ao client)

### c. Rodar o schema
1. Supabase Dashboard → **SQL Editor** → **New query**
2. Cole TODO o conteúdo de [`lib/db/schema.sql`](./lib/db/schema.sql)
3. **Run** — deve criar 3 tabelas, 5+ policies RLS, função `is_admin()`, view `admin_dashboard_stats`.

### d. Criar o primeiro admin
1. Supabase Dashboard → **Authentication** → **Users** → **Add user** → escolha **Create new user**
2. E-mail: o seu (ex: `everton@nomos.gt`), senha forte
3. Copie o **UUID** do user recém-criado (coluna `id`)
4. Volte ao **SQL Editor**, rode:
   ```sql
   insert into public.admin_profiles (user_id, nome, role)
   values ('COLE-O-UUID-AQUI', 'Éverton Vicente', 'superadmin');
   ```

Pronto. Agora você consegue logar em `/admin/login`.

---

## 2. Variáveis de ambiente

1. Copie `.env.local.example` → `.env.local`
2. Preencha as 3 chaves do Supabase
3. Gere um salt: `openssl rand -hex 32` → cola em `IP_HASH_SALT`

```bash
cp .env.local.example .env.local
# edite .env.local com seus valores
npm run dev
```

Em produção (Vercel): **Project Settings → Environment Variables** → adicione cada variável.

---

## 3. (Opcional) Email de notificação — Resend

Quando alguém envia o formulário de contato, um e-mail vai pro `EMAIL_NOTIF_TO` automaticamente.

### Setup
1. https://resend.com → conta grátis (100 emails/dia)
2. **API Keys** → **Create API Key** → cole em `RESEND_API_KEY`
3. **Domains** → adicione `nomos.gt`, valide DNS (3 registros)
4. Defina `EMAIL_FROM=NOMOS GT <contato@nomos.gt>` (qualquer @ do domínio validado)
5. Defina `EMAIL_NOTIF_TO=everton@nomos.gt`

Se pular esse passo, contatos continuam sendo salvos no banco — só não há notificação automática.

---

## 4. (Opcional) Rate limit — Upstash Redis

Protege os endpoints `/api/contato` e `/api/simulador` contra spam de bot e scraping.
**5 requests por minuto por IP.**

### Setup
1. https://console.upstash.com → **Create Database** → **Redis** → **Global**
2. **REST API** tab → copie:
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**

Sem isso o rate-limit fica desativado (no-op).

---

## 5. Schema — tabelas criadas

### `contact_submissions`
Todo lead — vem do formulário de `/contato` ou do CTA do simulador.

| Campo                 | Tipo        | Descrição                            |
|-----------------------|-------------|--------------------------------------|
| `id`                  | uuid        | PK                                   |
| `created_at`          | timestamptz | Timestamp                            |
| `updated_at`          | timestamptz | Auto-atualizado por trigger          |
| `nome`, `email`       | text        | Obrigatórios                         |
| `telefone`, `empresa`, `cargo` | text | Opcionais                       |
| `faturamento_estimado`| text        | Faixa (ex: `"25m-100m"`)             |
| `mensagem`            | text        | Texto livre                          |
| `origem`              | text        | `contato` / `simulador` / outro      |
| `ip_hash`             | text        | Hash SHA-256 (privacidade)           |
| `simulator_run_id`    | uuid        | FK → simulator_runs (se converteu)   |
| `status`              | text        | `novo` / `em_atendimento` / `qualificado` / `fechado` / `descartado` |
| `notas_internas`      | text        | Anotações dos admins                 |

### `simulator_runs`
Toda simulação rodada (mesmo sem identificação).

| Campo               | Tipo    | Descrição                                            |
|---------------------|---------|------------------------------------------------------|
| `id`                | uuid    | PK                                                   |
| `faturamento`       | numeric | Input — receita bruta anual                          |
| `despesa_indireta`  | numeric | Input — despesa indireta anual                       |
| `setor`             | text    | `industria` / `comercio` / `servicos` / etc          |
| `regime`            | text    | `real` / `presumido`                                 |
| `tese_judicial`     | numeric | Output — `(0.08+0.03) × RB × 5`                      |
| `tese_administrativa` | numeric | Output — fórmula por regime                        |
| `icms_comercio`     | numeric | Output — `0.15 × DI × 5` (só se setor=comércio)      |
| `total`             | numeric | Soma                                                 |

### `admin_profiles`
Quem tem acesso ao /admin. **Sem registro aqui = sem acesso.**

| Campo     | Tipo | Descrição                                  |
|-----------|------|--------------------------------------------|
| `user_id` | uuid | PK → auth.users(id)                        |
| `nome`    | text | Display name                               |
| `role`    | text | `viewer` / `admin` / `superadmin`          |

---

## 6. Row Level Security (RLS)

Toda tabela tem RLS habilitado. Resumo:

- **`contact_submissions`**: qualquer um pode INSERIR (form público). Só admins (registro em `admin_profiles`) podem ler/atualizar/deletar.
- **`simulator_runs`**: mesma coisa — público insere, admin lê.
- **`admin_profiles`**: cada user vê o próprio; só `service_role` cria/atualiza/deleta (você gerencia via SQL).

Isso significa: mesmo que vaze a `ANON_KEY` (que é pública por design), ninguém consegue ler os leads. A `SERVICE_ROLE_KEY` é a única que bypassa — e ela mora só no server.

---

## 7. Rotas criadas

### Público
- `POST /api/contato` — recebe form de contato, valida (Zod + honeypot + rate-limit), insere, dispara email.
- `POST /api/simulador` — recebe simulação, revalida fórmula server-side, insere.

### Admin (protegido por middleware)
- `/admin/login` — formulário de login
- `/admin` — dashboard com KPIs + recentes
- `/admin/contatos` — lista com filtros por status, busca por nome/email/empresa
- `/admin/contatos/[id]` — detalhe + editor de status + notas internas
- `/admin/simulacoes` — lista com totais
- `/admin/simulacoes/[id]` — detalhe + breakdown + link pro lead (se converteu)
- `POST /admin/sair` — logout

---

## 8. Como adicionar mais admins depois

No SQL Editor:
```sql
-- 1. Crie o user em Authentication → Users → Add user (ou peça pra pessoa se cadastrar)
-- 2. Pegue o UUID em auth.users
-- 3. Rode:
insert into public.admin_profiles (user_id, nome, role)
values ('UUID-do-novo-admin', 'Nome da pessoa', 'admin');

-- Roles disponíveis: 'viewer' (só lê), 'admin' (lê + edita), 'superadmin' (tudo)
-- A diferença prática entre admin e superadmin precisa ser implementada via policies
-- extras conforme necessidade.
```

---

## 9. Backup & exportação

Supabase Dashboard → **Database** → **Backups** (free tier: 1 backup diário automático, retenção 7 dias).

Para exportar manualmente para CSV:
```sql
copy (select * from contact_submissions order by created_at desc) to stdout with csv header;
```
Ou na Table Editor → ⋯ → **Export as CSV**.

---

## 10. Deploy na Vercel

1. Conecte o repo na Vercel
2. **Project Settings → Environment Variables** → adicione TODAS as variáveis do `.env.local`
3. Marque pra `Production`, `Preview`, e `Development` se quiser
4. **Deploy** — o middleware Supabase é compatível com Edge automaticamente.

---

## Checklist de "Já tá pronto?"

- [ ] Projeto Supabase criado, schema.sql rodado, RLS ativo
- [ ] Primeiro admin criado em `admin_profiles` (via SQL Editor)
- [ ] `.env.local` com as 3 chaves Supabase preenchidas
- [ ] `npm run dev` → consegue logar em http://localhost:3000/admin/login
- [ ] Form de contato funciona (testa em http://localhost:3000/contato)
- [ ] Simulador grava no DB (testa em http://localhost:3000/simulador)
- [ ] (Opcional) Resend configurado → recebe email ao enviar contato
- [ ] (Opcional) Upstash configurado → rate limit ativo
- [ ] Vercel deploy com mesmas vars no Production
