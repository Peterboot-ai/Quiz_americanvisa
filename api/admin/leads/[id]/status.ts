import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase.js';
import { requireAuth } from '../../../_lib/auth.js';

const VALID_STATUSES = ['novo', 'transferido'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;
  const { status } = req.body as { status: string };

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: 'Status inválido' });
  }

  // Validate tenant ownership
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('id, tenant_id')
    .eq('id', id)
    .single();

  if (fetchError || !lead) {
    return res.status(404).json({ success: false, error: 'Lead não encontrado' });
  }

  if (auth.role !== 'super_admin' && auth.tenant && lead.tenant_id !== auth.tenant.id) {
    return res.status(403).json({ success: false, error: 'Acesso não autorizado' });
  }

  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ success: false, error: 'Falha ao atualizar status' });
  }

  return res.status(200).json({ success: true });
}
