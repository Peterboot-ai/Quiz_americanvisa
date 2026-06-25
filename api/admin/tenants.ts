import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

const CreateTenantSchema = z.object({
  slug:                z.string().min(2).regex(/^[a-z0-9-]+$/),
  name:                z.string().min(1),
  legal_name:          z.string().optional(),
  domains:             z.array(z.string()).default([]),
  allowed_email_domain: z.string().optional(),
  sender_email:        z.string().email().optional(),
  sender_name:         z.string().optional(),
  report_recipients:   z.array(z.string().email()).default([]),
  theme:               z.record(z.string()).optional(),
  assets:              z.record(z.unknown()).optional(),
  contact:             z.record(z.unknown()).optional(),
  copy:                z.record(z.unknown()).optional(),
  tracking:            z.record(z.string()).optional(),
  team:                z.record(z.unknown()).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res, 'super_admin');
  if (!auth) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug, name, legal_name, active, domains, allowed_email_domain, sender_email, sender_name, report_recipients, theme, assets, contact, copy, tracking, team, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, tenants: data });
  }

  if (req.method === 'POST') {
    const parsed = CreateTenantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });

    const { data, error } = await supabase
      .from('tenants')
      .insert({ ...parsed.data, active: true })
      .select('id, slug, name')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Slug já existe' });
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ success: true, tenant: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
