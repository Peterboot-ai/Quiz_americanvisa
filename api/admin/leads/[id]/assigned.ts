import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase.js';
import { requireAuth } from '../../../_lib/auth.js';
import { TeamSchema } from '../../../_lib/tenant-schema.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;
  const { assigned_to } = req.body as { assigned_to: string };

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

  // Validate assignee against the lead's tenant team list (empty string = unassign)
  const { data: leadTenant } = await supabase
    .from('tenants')
    .select('team')
    .eq('id', lead.tenant_id)
    .single();
  const team = TeamSchema.parse((leadTenant as { team: unknown })?.team);
  const validAssignees = [...team.assignees, ''];
  if (!validAssignees.includes(assigned_to)) {
    return res.status(400).json({ success: false, error: 'Responsável inválido' });
  }

  const { error } = await supabase
    .from('leads')
    .update({ assigned_to: assigned_to || null })
    .eq('id', id);

  if (error) {
    console.error('Error updating assigned_to:', error);
    return res.status(500).json({ success: false, error: 'Falha ao atualizar responsável' });
  }

  return res.status(200).json({ success: true });
}
