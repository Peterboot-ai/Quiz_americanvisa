# Quiz America — Setup Guide

Produto white-label multi-tenant de quiz de elegibilidade para vistos americanos.  
Stack: **React + Vite** (frontend) · **Vercel Serverless** (API) · **Supabase** (banco + auth + storage)

---

## Pré-requisitos

- Node.js 18+
- Conta Vercel (linked ao GitHub)
- Projeto Supabase já criado (ref `fylycfktigdaigoixcfu`, org DEV-ukconsultoria)
- Conta Brevo (e-mail transacional) por tenant

---

## 1. Variáveis de ambiente

### Local (`.env`)

Copie `.env.example` (ou crie `.env`) com:

```env
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key — NUNCA expor ao frontend>

VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>

CRON_SECRET=<string aleatória longa — gere com openssl rand -hex 32>
DEFAULT_TENANT=unlocked
SITE_URL=http://localhost:5173
```

> **Segurança:** `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` devem existir **apenas** no servidor (Vercel env vars). Nunca commitar o `.env`.

### Vercel (production)

No dashboard Vercel → Settings → Environment Variables, adicione todas as variáveis acima **mais**:

```
SITE_URL=https://<seu-dominio>.vercel.app
```

---

## 2. Banco de dados (Supabase)

As migrations já foram aplicadas. Para um projeto novo, aplique na ordem:

```
supabase/migrations/001_init.sql          — tabelas, RLS, funções helper
supabase/migrations/002_seed_unlocked.sql — tenant #1 (Unlocked)
supabase/migrations/003_update_unlocked_contact.sql — campos email/website/footer
supabase/migrations/005_seed_super_admin.sql        — template (ver seção 4)
```

Via Supabase MCP ou SQL Editor do dashboard.

---

## 3. Supabase Auth — Google OAuth

1. No Supabase dashboard → Authentication → Providers → Google: ativar
2. Criar credenciais OAuth no Google Cloud Console (tipo "Web application")
3. Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`
4. Copiar Client ID e Secret para o Supabase
5. No Supabase → Authentication → URL Configuration:
   - Site URL: `https://<seu-dominio>`
   - Redirect URLs: `https://<seu-dominio>/auth/callback`

---

## 4. Primeiro super_admin

Após configurar o Google OAuth:

1. Acesse `https://<seu-dominio>/super-admin`
2. Faça login com Google
3. No SQL Editor do Supabase, encontre seu UUID:
   ```sql
   select id, email from auth.users;
   ```
4. Insira o super_admin:
   ```sql
   insert into public.tenant_users (user_id, tenant_id, role)
   values ('<UUID>', 1, 'super_admin');
   ```
5. Recarregue `/super-admin` — acesso liberado.

---

## 5. Storage (assets dos tenants)

O bucket `tenant-assets` já foi criado via migration com:
- Leitura pública
- Upload via service_role (apenas pela API)
- Limite: 5 MB por arquivo
- Tipos permitidos: PNG, JPEG, WebP, SVG, PDF

Para fazer upload de logos e imagens, use o painel Super Admin → aba **Assets**.

---

## 6. Brevo (e-mail transacional)

Cada tenant tem sua própria chave Brevo. Configure via Super Admin → Informações:

- **Brevo API Key**: chave `xkeysib-...` da conta Brevo do parceiro
- **E-mail remetente**: ex. `contato@parceiro.com.br`
- **Nome remetente**: ex. `Parceiro Consultoria`
- **Destinatários do relatório**: e-mails que recebem o relatório diário

---

## 7. Cron job (relatório diário)

O Vercel executa `GET /api/cron/daily-report` todos os dias às **11:00 UTC** (08:00 Brasília).

O endpoint valida o header `Authorization: Bearer <CRON_SECRET>` — configure a variável `CRON_SECRET` no Vercel com o mesmo valor do `.env`.

Para testar manualmente: no painel Admin → botão **Testar Relatório**.

---

## 8. Deploy no Vercel

```bash
# 1. Push para o GitHub
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main

# 2. No Vercel: New Project → importar o repo
#    Framework: Other (não selecionar Vite — o vercel.json já configura tudo)
#    Build command: vite build
#    Output dir: dist

# 3. Adicionar as variáveis de ambiente (seção 1)
# 4. Deploy
```

O `vercel.json` já configura:
- Rewrites: `/api/*` → serverless functions, `/*` → SPA
- `/ebook` → redirect para asset do tenant
- Cron: diário às 11:00 UTC

---

## 9. Adicionar um novo parceiro (tenant)

1. Acesse `/super-admin` como super_admin
2. Clique em **+ Novo** na sidebar
3. Preencha: slug, nome, domínio de e-mail, remetente Brevo
4. Na aba **Assets**: faça upload do logo
5. Na aba **Cores**: ajuste navy/gold para a marca do parceiro
6. Na aba **Informações**: adicione os domínios do parceiro e a chave Brevo
7. Na aba **Usuários**: convide o(s) partner_admin com o e-mail corporativo
8. Na aba **Equipe**: adicione os nomes dos responsáveis pelo atendimento

O partner_admin receberá um e-mail de convite via Supabase Auth e poderá acessar `/admin` no domínio configurado.

---

## 10. Estrutura do projeto

```
api/
  _lib/           — supabase.ts, auth.ts, tenant.ts, tenant-schema.ts, email-template.ts
  admin/
    leads.ts      — GET /api/admin/leads
    leads/[id].ts — GET/DELETE /api/admin/leads/:id
    leads/[id]/status.ts   — PATCH status
    leads/[id]/assigned.ts — PATCH responsável
    leads/test-daily-report.ts
    onboarding.ts          — GET /api/admin/onboarding
    tenants.ts             — GET/POST /api/admin/tenants
    tenants/[id].ts        — GET/PATCH/DELETE /api/admin/tenants/:id
    tenants/[id]/users.ts  — GET/POST/DELETE usuários do tenant
    tenants/[id]/upload.ts — POST upload de asset
  cron/
    daily-report.ts        — relatório diário (todos os tenants)
  tenant/
    config.ts              — GET /api/tenant/config (público, com cache)
  leads.ts                 — POST /api/leads (submissão do quiz)
  ebook.ts                 — GET /ebook (redirect para asset)

src/react-app/
  contexts/TenantContext.tsx  — TenantProvider + useTenant() + CSS vars + GTM
  pages/
    Quiz.tsx       — quiz público, branding dinâmico do tenant
    Admin.tsx      — painel de leads do parceiro
    SuperAdmin.tsx — painel de gestão de tenants (super_admin only)
    AuthCallback.tsx
  components/
    OnboardingChecklist.tsx
    LeadDetailModal.tsx
    CriteriaModal.tsx

supabase/migrations/
  001_init.sql               — schema, RLS, funções
  002_seed_unlocked.sql      — tenant Unlocked (tenant #1)
  003_update_unlocked_contact.sql
  005_seed_super_admin.sql   — template para inserir super_admin
```

---

## 11. Rotas

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Público | Quiz de elegibilidade |
| `/admin` | partner_admin / super_admin | Painel de leads |
| `/super-admin` | super_admin | Gestão de tenants |
| `/auth/callback` | — | Callback OAuth Google |
| `/ebook` | Público | Redirect para e-book do tenant |
| `GET /api/tenant/config` | Público | Config pública do tenant (cached) |
| `POST /api/leads` | Público | Submissão do quiz |
| `GET /api/admin/leads` | Auth | Lista leads do tenant |
| `GET /api/admin/onboarding` | Auth | Status de setup do tenant |
| `GET /api/admin/tenants` | super_admin | Lista todos os tenants |
| `GET /api/cron/daily-report` | CRON_SECRET | Relatório diário |

---

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY` **nunca** vai ao frontend nem ao git
- `brevo_api_key` **nunca** é exposta ao frontend — somente usada nas API routes
- RLS habilitado em `tenants`, `leads` e `tenant_users`
- Bearer token validado em **todas** as rotas `/api/admin/*`
- Super admin identificado por `role = 'super_admin'` na tabela `tenant_users`
- Upload de assets aceita apenas via service_role (a partir da API)
