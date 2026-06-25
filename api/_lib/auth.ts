import type { IncomingMessage, ServerResponse } from 'node:http';
import { supabaseAnon, supabase } from './supabase.js';
import { resolveTenant } from './tenant.js';
import type { TenantRow } from './tenant.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'super_admin' | 'partner_admin';
  tenant: TenantRow | null;
}

function extractBearer(req: IncomingMessage): string | null {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function resolveAuth(req: IncomingMessage): Promise<AuthUser | null> {
  const token = extractBearer(req);
  if (!token) return null;

  // Validate token via anon client (verifies JWT signature)
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user?.email) return null;

  // Use service_role to bypass RLS when reading tenant_users
  const { data: superTu } = await supabase
    .from('tenant_users')
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .maybeSingle();

  if (superTu) {
    return { id: user.id, email: user.email, role: 'super_admin', tenant: null };
  }

  // For partner_admin: resolve tenant from request and check membership
  const tenant = await resolveTenant(req);
  if (!tenant) return null;

  const { data: tu } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (!tu?.role) return null;
  const role = tu.role as 'partner_admin';

  // Enforce allowed_email_domain for partner_admins
  if (tenant.allowed_email_domain) {
    if (!user.email.endsWith(tenant.allowed_email_domain)) return null;
  }

  return { id: user.id, email: user.email, role, tenant };
}

export async function requireAuth(
  req: IncomingMessage,
  res: ServerResponse,
  requiredRole?: 'super_admin' | 'partner_admin',
): Promise<AuthUser | null> {
  const auth = await resolveAuth(req);

  if (!auth) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Não autenticado' }));
    return null;
  }

  if (requiredRole && auth.role !== requiredRole && auth.role !== 'super_admin') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Acesso não autorizado' }));
    return null;
  }

  return auth;
}
