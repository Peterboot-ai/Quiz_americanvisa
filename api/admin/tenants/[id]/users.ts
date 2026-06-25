import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../../../../_lib/supabase.js';
import { requireAuth } from '../../../../_lib/auth.js';

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['partner_admin']).default('partner_admin'),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res, 'super_admin');
  if (!auth) return;

  const id = Number(req.query.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  // Confirm tenant exists
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, allowed_email_domain')
    .eq('id', id)
    .single();

  if (tenantErr || !tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  if (req.method === 'GET') {
    // List users for this tenant
    const { data: rows, error } = await supabase
      .from('tenant_users')
      .select('user_id, role, created_at')
      .eq('tenant_id', id);

    if (error) return res.status(500).json({ error: error.message });

    // Enrich with emails from auth.users via admin API
    const enriched = await Promise.all(
      (rows ?? []).map(async (row) => {
        const { data } = await supabase.auth.admin.getUserById(row.user_id);
        return {
          user_id: row.user_id,
          email: data?.user?.email ?? '(desconhecido)',
          role: row.role,
          created_at: row.created_at,
        };
      })
    );

    return res.status(200).json({ success: true, users: enriched });
  }

  if (req.method === 'POST') {
    const parsed = InviteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });

    const { email, role } = parsed.data;

    // Enforce allowed_email_domain if configured
    if (tenant.allowed_email_domain && !email.endsWith(tenant.allowed_email_domain)) {
      return res.status(400).json({
        error: `E-mail deve pertencer ao domínio ${tenant.allowed_email_domain}`,
      });
    }

    // Check if user already exists in auth
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existing = existingList?.users?.find(u => u.email === email);

    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      // Send invite email via Supabase Auth
      const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.SITE_URL ?? 'https://quiz-america.vercel.app'}/auth/callback`,
        data: { tenant_name: tenant.name },
      });
      if (inviteErr) return res.status(500).json({ error: inviteErr.message });
      userId = invited.user.id;
    }

    // Check if already a member of this tenant
    const { data: existing_tu } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', id)
      .maybeSingle();

    if (existing_tu) {
      return res.status(409).json({ error: 'Usuário já é membro deste tenant' });
    }

    const { error: insertErr } = await supabase
      .from('tenant_users')
      .insert({ user_id: userId, tenant_id: id, role });

    if (insertErr) return res.status(500).json({ error: insertErr.message });

    return res.status(201).json({ success: true, user_id: userId, email, role });
  }

  if (req.method === 'DELETE') {
    const { user_id } = req.body as { user_id: string };
    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });

    const { error } = await supabase
      .from('tenant_users')
      .delete()
      .eq('user_id', user_id)
      .eq('tenant_id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
