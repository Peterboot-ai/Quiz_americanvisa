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

  // super_admin vê todos os tenants; partner_admin vê só o próprio
  if (auth.role !== 'super_admin' && auth.tenant) {
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
