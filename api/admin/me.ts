import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  return res.status(200).json({
    success: true,
    role: auth.role,
    tenant: auth.tenant ? { id: auth.tenant.id, slug: auth.tenant.slug, name: auth.tenant.name } : null,
  });
}
