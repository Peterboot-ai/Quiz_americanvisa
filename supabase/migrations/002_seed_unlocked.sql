-- =============================================================================
-- Quiz America — Seed do tenant #1 (Unlocked)
--
-- Insere o tenant Unlocked com os valores extraídos do app original (Mocha).
-- A chave Brevo NÃO vai aqui (segredo) — preencher depois via super-admin ou
-- UPDATE manual no SQL Editor:
--   update public.tenants set brevo_api_key = '<chave>' where slug = 'unlocked';
--
-- Os assets ainda apontam para *.mochausercontent.com (vão sair do ar quando o
-- Mocha encerrar) — substituir por URLs do Supabase Storage no super-admin.
-- =============================================================================

insert into public.tenants (
  slug, name, legal_name, active,
  domains, allowed_email_domain,
  sender_email, sender_name, report_recipients,
  theme, assets, contact, copy, tracking, team
) values (
  'unlocked',
  'Unlocked',
  'Unlocked Consultoria Migratória',
  true,
  array['unlockedtravel.com.br', 'www.unlockedtravel.com.br'],
  '@unlockedtravel.com.br',
  'contato@unlockedtravel.com.br',
  'Unlocked Consultoria',
  array[
    'ana.modolo@unlockedtravel.com.br',
    'gilmara.langner@unlockedtravel.com.br',
    'rebeca@unlockedtravel.com.br',
    'sac@unlockedtravel.com.br',
    'contas.receber@unlockedtravel.com.br'
  ],
  -- theme (cores da marca)
  jsonb_build_object(
    'navy',     '#1B2541',
    'navyAlt',  '#1a2847',
    'gold',     '#B8860B',
    'goldAlt',  '#D4A847',
    'cream',    '#F0EDE8',
    'creamAlt', '#FAFAF8',
    'flagBlue', '#1B3A6B',
    'flagRed',  '#C41E3A'
  ),
  -- assets (TODO: migrar para Supabase Storage; hoje apontam para o Mocha)
  jsonb_build_object(
    'logoUrl',     'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/logo-original.png',
    'logoLight',   'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/2.png',
    'ogImageUrl',  'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/og-social.png',
    'proofImages', jsonb_build_array(
      'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/PROVA-1.png',
      'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/PROVA-2.png',
      'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/PROVA-3.png'
    ),
    'ebookUrl',    'https://drive.google.com/uc?export=download&id=14FEGdQOGuRiN3wq9O_nAxXqW6JUillgh'
  ),
  -- contact
  jsonb_build_object(
    'whatsapp',  '554197177910',
    'phone',     '+55 41 9923-1005',
    'instagram', '@unlockedtravel',
    'address',   jsonb_build_object('country', 'BR', 'city', 'Curitiba', 'state', 'PR')
  ),
  -- copy (textos editáveis pelo tenant)
  jsonb_build_object(
    'approvalRateEbNiwEb1a', '82%',
    'approvalRateL1aO1a',    '96%',
    'clientProofs', jsonb_build_array(
      jsonb_build_object('name', 'Ana Castela',  'label', 'É cliente Unlocked'),
      jsonb_build_object('name', 'Caio Souza',   'label', 'É cliente Unlocked'),
      jsonb_build_object('name', 'Gui Deodato',  'label', 'É cliente Unlocked')
    )
  ),
  -- tracking
  jsonb_build_object('gtmId', 'GTM-P5NPC8H9'),
  -- team (responsáveis no admin)
  jsonb_build_object(
    'assignees', jsonb_build_array('Amanda', 'Julia', 'Lênia', 'Isabela', 'Cristiane')
  )
);
