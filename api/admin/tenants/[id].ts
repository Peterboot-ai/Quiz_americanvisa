import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../../_lib/supabase.js';
import { requireAuth } from '../../_lib/auth.js';
import { invalidateTenantCache } from '../../_lib/tenant.js';

const PatchTenantSchema = z.object({
  name:                z.string().min(1).optional(),
  legal_name:          z.string().optional(),
  active:              z.boolean().optional(),
  domains:             z.array(z.string()).optional(),
  allowed_email_domain: z.string().optional(),
  sender_email:        z.string().email().optional(),
  sender_name:         z.string().optional(),
  report_recipients:   z.array(z.string().email()).optional(),
  brevo_api_key:       z.string().optional(),
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

  const id = Number(req.query.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug, name, legal_name, active, domains, allowed_email_domain, sender_email, sender_name, report_recipients, theme, assets, contact, copy, tracking, team, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Tenant não encontrado' });
    return res.status(200).json({ success: true, tenant: data });
  }

  if (req.method === 'PATCH') {
    const parsed = PatchTenantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });

    // For JSONB fields, merge with existing data instead of replacing
    const jsonbFields = ['theme', 'assets', 'contact', 'copy', 'tracking', 'team'] as const;
    const directFields: Record<string, unknown> = { ...parsed.data };

    for (const field of jsonbFields) {
      if (parsed.data[field]) {
        // Fetch current value and merge
        const { data: current } = await supabase
          .from('tenants')
          .select(field)
          .eq('id', id)
          .single();

        if (current) {
          directFields[field] = { ...(current[field] as object ?? {}), ...(parsed.data[field] as object) };
        }
      }
    }

    const { data, error } = await supabase
      .from('tenants')
      .update(directFields)
      .eq('id', id)
      .select('id, slug, name, active')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (data?.slug) invalidateTenantCache(data.slug);
    return res.status(200).json({ success: true, tenant: data });
  }

  if (req.method === 'DELETE') {
    // Soft delete — apenas desativa
    const { error } = await supabase
      .from('tenants')
      .update({ active: false })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
