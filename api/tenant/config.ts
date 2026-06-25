import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveTenant, toPublicConfig } from '../_lib/tenant.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tenant = await resolveTenant(req);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant não encontrado para este domínio' });
  }

  const config = toPublicConfig(tenant);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(config);
}
