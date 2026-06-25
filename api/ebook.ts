import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveTenant } from './_lib/tenant.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tenant = await resolveTenant(req);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant não encontrado' });
  }

  const ebookUrl = (tenant.assets as Record<string, unknown>)?.ebookUrl as string | undefined;
  if (!ebookUrl) {
    return res.status(404).json({ error: 'E-book não configurado para este tenant' });
  }

  return res.redirect(302, ebookUrl);
}
