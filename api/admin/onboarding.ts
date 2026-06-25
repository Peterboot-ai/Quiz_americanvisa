import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';
import { resolveTenant } from '../_lib/tenant.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  // Resolve tenant: super_admin exige ?tenant=slug explícito
  let tenant = auth.tenant;
  if (auth.role === 'super_admin') {
    const tenantSlug = req.query.tenant as string | undefined;
    if (!tenantSlug) return res.status(400).json({ error: 'Parâmetro tenant obrigatório' });
    const { data: tenantRow } = await supabase.from('tenants').select('id, slug, name').eq('slug', tenantSlug).eq('active', true).single();
    if (!tenantRow) return res.status(404).json({ error: 'Tenant não encontrado' });
    tenant = tenantRow as typeof tenant;
  }
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  // Fetch full tenant row (including secrets we need to check, but won't expose)
  const { data, error } = await supabase
    .from('tenants')
    .select('domains, allowed_email_domain, brevo_api_key, sender_email, assets, theme, team, report_recipients')
    .eq('id', tenant.id)
    .single();

  if (error || !data) return res.status(500).json({ error: 'Falha ao carregar tenant' });

  const assets = (data.assets as Record<string, unknown>) ?? {};
  const theme  = (data.theme  as Record<string, string>)  ?? {};
  const team   = (data.team   as { assignees?: string[] }) ?? {};

  const defaultNavy = '#1B2541';
  const defaultGold = '#B8860B';

  const steps = [
    {
      key: 'domain',
      label: 'Domínio configurado',
      description: 'Adicione o domínio do parceiro para resolução automática do tenant.',
      done: Array.isArray(data.domains) && data.domains.length > 0,
    },
    {
      key: 'logo',
      label: 'Logo carregado',
      description: 'Faça upload do logo principal no painel Super Admin → Assets.',
      done: !!assets.logoUrl && String(assets.logoUrl).length > 0,
    },
    {
      key: 'colors',
      label: 'Cores da marca',
      description: 'Personalize navy e gold com as cores do parceiro.',
      done: theme.navy !== defaultNavy || theme.gold !== defaultGold,
    },
    {
      key: 'brevo',
      label: 'E-mail configurado (Brevo)',
      description: 'Configure a chave Brevo e o e-mail remetente no Super Admin → Informações.',
      done: !!data.brevo_api_key && !!data.sender_email,
    },
    {
      key: 'recipients',
      label: 'Destinatários do relatório',
      description: 'Defina quem recebe o relatório diário de leads.',
      done: Array.isArray(data.report_recipients) && data.report_recipients.length > 0,
    },
    {
      key: 'team',
      label: 'Equipe configurada',
      description: 'Adicione os nomes dos responsáveis pelo atendimento.',
      done: Array.isArray(team.assignees) && team.assignees.length > 0,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const isComplete = completedCount === steps.length;

  return res.status(200).json({
    success: true,
    isComplete,
    completedCount,
    totalCount: steps.length,
    steps,
  });
}
