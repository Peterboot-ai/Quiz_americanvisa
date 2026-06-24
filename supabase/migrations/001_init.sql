-- =============================================================================
-- Quiz America — Migration inicial (multi-tenant)
-- PostgreSQL / Supabase
--
-- Cria: tenants, leads (com tenant_id), tenant_users, índices, trigger de
-- updated_at, e políticas RLS (segunda camada de defesa — a API filtra por
-- tenant_id com service_role; RLS protege acesso direto).
--
-- Para rodar: cole no SQL Editor do Supabase (projeto Quiz_America) e execute,
-- OU via Supabase CLI / MCP apply_migration.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Função utilitária: manter updated_at em UPDATE
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Tabela: tenants  (um registro por parceiro white-label)
-- ----------------------------------------------------------------------------
create table public.tenants (
  id                   bigserial primary key,
  slug                 text not null unique,
  name                 text not null,
  legal_name           text,
  active               boolean not null default true,

  -- domínios que resolvem para este tenant (ex.: {'quiz.parceiro.com'})
  domains              text[] not null default '{}',

  -- domínio de e-mail autorizado para o admin deste tenant (ex.: '@parceiro.com')
  allowed_email_domain text,

  -- e-mail (Brevo) — SEGREDOS: nunca expor ao frontend
  brevo_api_key        text,
  sender_email         text,
  sender_name          text,
  report_recipients    text[] not null default '{}',

  -- configuração pública (validada por Zod na borda) — sem segredos
  theme                jsonb not null default '{}'::jsonb,  -- cores, fontes
  assets               jsonb not null default '{}'::jsonb,  -- logo, ogImage, proofImages, ebookUrl
  contact              jsonb not null default '{}'::jsonb,  -- whatsapp, phone, instagram, address
  copy                 jsonb not null default '{}'::jsonb,  -- stats, provas sociais, serviços, headlines
  tracking             jsonb not null default '{}'::jsonb,  -- gtmId
  team                 jsonb not null default '{}'::jsonb,  -- assignees

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_tenants_slug on public.tenants(slug);
-- busca por domínio (resolução de tenant): índice GIN no array
create index idx_tenants_domains on public.tenants using gin(domains);

create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Tabela: leads  (convertida do schema SQLite/D1 + tenant_id)
-- ----------------------------------------------------------------------------
create table public.leads (
  id             bigserial primary key,
  tenant_id      bigint not null references public.tenants(id) on delete cascade,

  name           text not null,
  phone          text not null,
  email          text not null,

  primary_visa   text not null,
  secondary_visa text not null,
  viability      text not null,
  any_eligible   boolean not null,
  l1a_risk       boolean not null,
  company_size   text,

  eb2niw_met     integer,
  eb2niw_total   integer,
  eb2niw_pct     integer,
  eb1a_met       integer,
  eb1a_total     integer,
  eb1a_pct       integer,
  l1a_met        integer,
  l1a_total      integer,
  l1a_pct        integer,
  o1a_met        integer,
  o1a_total      integer,
  o1a_pct        integer,

  tags           text,                 -- string separada por vírgula (igual ao original)
  answers        jsonb not null,       -- era TEXT(JSON) no SQLite → JSONB
  status         text not null default 'novo',
  notes          text,
  assigned_to    text,
  purpose        text,
  priority       text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_leads_email             on public.leads(email);
create index idx_leads_status            on public.leads(status);
create index idx_leads_created_at        on public.leads(created_at desc);
create index idx_leads_tenant_id         on public.leads(tenant_id);
-- índice composto para a listagem do admin (por tenant, mais recentes primeiro)
create index idx_leads_tenant_created_at on public.leads(tenant_id, created_at desc);

create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Tabela: tenant_users  (vincula usuário do Supabase Auth a um tenant + papel)
-- ----------------------------------------------------------------------------
create table public.tenant_users (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tenant_id  bigint not null references public.tenants(id) on delete cascade,
  role       text not null check (role in ('super_admin', 'partner_admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

create index idx_tenant_users_user_id   on public.tenant_users(user_id);
create index idx_tenant_users_tenant_id on public.tenant_users(tenant_id);

-- ----------------------------------------------------------------------------
-- Helpers de autorização (usados pelas políticas RLS)
-- ----------------------------------------------------------------------------

-- true se o usuário atual é super_admin (acesso global)
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_users
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

-- true se o usuário atual pertence ao tenant informado
create or replace function public.is_member_of_tenant(p_tenant_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_users
    where user_id = auth.uid() and tenant_id = p_tenant_id
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS — segunda camada de defesa
-- (a API usa service_role e SEMPRE filtra por tenant_id; isto protege acesso
--  direto via anon/authenticated)
-- ----------------------------------------------------------------------------
alter table public.tenants      enable row level security;
alter table public.leads        enable row level security;
alter table public.tenant_users enable row level security;

-- tenants: super_admin gerencia tudo; membro lê só o próprio tenant.
-- (o tema público sai via API /api/tenant/config com service_role — anon não
--  lê a tabela diretamente, protegendo os segredos brevo_api_key/recipients)
create policy tenants_super_admin_all on public.tenants
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy tenants_member_select on public.tenants
  for select to authenticated
  using (public.is_member_of_tenant(id));

-- leads: super_admin vê tudo; membro vê/edita só os do próprio tenant.
create policy leads_super_admin_all on public.leads
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy leads_member_all on public.leads
  for all to authenticated
  using (public.is_member_of_tenant(tenant_id))
  with check (public.is_member_of_tenant(tenant_id));

-- tenant_users: usuário lê só os próprios vínculos; super_admin gerencia todos.
create policy tenant_users_self_select on public.tenant_users
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

create policy tenant_users_super_admin_all on public.tenant_users
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- NOTA: nenhuma policy concede acesso ao papel `anon`. Logo, clientes anônimos
-- (frontend sem login) NÃO leem leads nem segredos de tenants diretamente —
-- todo acesso público passa pela API com service_role.
