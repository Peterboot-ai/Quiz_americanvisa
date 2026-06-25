import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const status = req.query.status as string | undefined;
  const tenantSlug = req.query.tenant as string | undefined;

  let query = supabase
    .from('leads')
    .select(`
      id, name, phone, email,
      primary_visa, secondary_visa, viability,
      any_eligible, l1a_risk,
      eb2niw_met, eb2niw_total, eb2niw_pct,
      eb1a_met, eb1a_total, eb1a_pct,
      l1a_met, l1a_total, l1a_pct,
      o1a_met, o1a_total, o1a_pct,
      tags, status, notes, assigned_to, purpose, priority, created_at
    `)
    .order('created_at', { ascending: false });

  if (auth.role === 'super_admin' && tenantSlug) {
    // Super admin acessando admin de um tenant específico — filtra por slug
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .eq('active', true)
      .single();
    if (tenantRow) {
      query = query.eq('tenant_id', tenantRow.id);
    }
  } else if (auth.role !== 'super_admin' && auth.tenant) {
    // partner_admin sempre vê só o próprio tenant
    query = query.eq('tenant_id', auth.tenant.id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ success: false, error: 'Falha ao buscar leads' });
  }

  return res.status(200).json({ success: true, leads: data });
}
