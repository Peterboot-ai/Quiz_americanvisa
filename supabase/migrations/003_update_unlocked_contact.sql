-- Adiciona campos de email, website ao contact da Unlocked
-- e campos de copy para footer (footerTagline, footerCopyright, footerAddress)
-- Estes campos foram adicionados ao TenantPublicConfigSchema após o seed inicial.

update public.tenants
set
  contact = contact || jsonb_build_object(
    'email',   'contato@unlockedtravel.com.br',
    'website', 'unlockedtravel.com.br'
  ),
  copy = copy || jsonb_build_object(
    'footerTagline',   'Consultoria especializada em processos migratórios e estratégias de acúmulo de milhas aéreas.',
    'footerCopyright', '© 2026 Unlocked Consultoria Migratória • Todos os direitos reservados',
    'footerAddress',   'CNPJ: 40.124.324/0001-56 • Av. Brasil, 695 - 1° Andar - Centro, Mandirituba - PR, 83800-036'
  )
where slug = 'unlocked';
