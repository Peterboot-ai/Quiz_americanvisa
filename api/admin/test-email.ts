import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';
import { generateEmailHTML } from '../_lib/email-template.js';
import { AssetsSchema, ContactSchema, CopySchema, ThemeSchema } from '../_lib/tenant-schema.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAuth(req, res, 'super_admin');
  if (!auth) return;

  const { tenant_id, to_email } = req.body ?? {};
  if (!tenant_id || !to_email) {
    return res.status(400).json({ error: 'tenant_id e to_email são obrigatórios' });
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenant_id)
    .single();

  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });
  if (!tenant.brevo_api_key) return res.status(400).json({ error: 'Tenant sem brevo_api_key configurada' });
  if (!tenant.sender_email) return res.status(400).json({ error: 'Tenant sem sender_email configurado' });

  const theme   = ThemeSchema.parse(tenant.theme);
  const assets  = AssetsSchema.parse(tenant.assets);
  const contact = ContactSchema.parse(tenant.contact);
  const copy    = CopySchema.parse(tenant.copy);

  const emailHTML = generateEmailHTML({
    name: 'Teste',
    email: to_email,
    primary_visa: 'eb2niw',
    visas: {
      eb2niw: { met: 7, total: 10, pct: 70 },
      eb1a:   { met: 5, total: 10, pct: 50 },
      l1a:    { met: 3, total: 5,  pct: 60 },
      o1a:    { met: 4, total: 8,  pct: 50 },
    },
    any_eligible: true,
    l1a_risk: false,
    tenant: { name: tenant.name, theme, assets, contact, copy },
  });

  const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': tenant.brevo_api_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: tenant.sender_name ?? tenant.name, email: tenant.sender_email },
      to: [{ email: to_email, name: 'Teste' }],
      subject: `[TESTE] Email do quiz — ${tenant.name}`,
      htmlContent: emailHTML,
    }),
  });

  const brevoBody = await brevoRes.text();

  return res.status(200).json({
    brevo_status: brevoRes.status,
    brevo_ok: brevoRes.ok,
    brevo_response: brevoBody,
    sender_email: tenant.sender_email,
    sender_name: tenant.sender_name,
  });
}
