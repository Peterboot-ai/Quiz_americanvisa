import type { IncomingMessage } from 'node:http';
import { supabase } from './supabase.js';
import { TenantPublicConfigSchema } from './tenant-schema.js';

// Full tenant row (server-side only — contains secrets)
export interface TenantRow {
  id: number;
  slug: string;
  name: string;
  active: boolean;
  domains: string[];
  allowed_email_domain: string | null;
  brevo_api_key: string | null;
  sender_email: string | null;
  sender_name: string | null;
  report_recipients: string[];
  theme: Record<string, unknown>;
  assets: Record<string, unknown>;
  contact: Record<string, unknown>;
  copy: Record<string, unknown>;
  tracking: Record<string, unknown>;
  team: Record<string, unknown>;
}

// Simple in-memory cache: slug → tenant, expires after 60s
const cache = new Map<string, { tenant: TenantRow; expiresAt: number }>();
const CACHE_TTL_MS = 0;

export function invalidateTenantCache(slug: string) {
  cache.delete(`slug:${slug}`);
  for (const key of cache.keys()) {
    if (key.startsWith('domain:')) {
      const entry = cache.get(key);
      if (entry?.tenant.slug === slug) cache.delete(key);
    }
  }
}

function getCached(key: string): TenantRow | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.tenant;
}

function setCached(key: string, tenant: TenantRow) {
  cache.set(key, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchByDomain(domain: string): Promise<TenantRow | null> {
  const cached = getCached(`domain:${domain}`);
  if (cached) return cached;

  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('active', true)
    .contains('domains', [domain])
    .single();

  if (!data) return null;
  setCached(`domain:${domain}`, data as TenantRow);
  setCached(`slug:${data.slug}`, data as TenantRow);
  return data as TenantRow;
}

async function fetchBySlug(slug: string): Promise<TenantRow | null> {
  const cached = getCached(`slug:${slug}`);
  if (cached) return cached;

  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('active', true)
    .eq('slug', slug)
    .single();

  if (!data) return null;
  setCached(`slug:${slug}`, data as TenantRow);
  return data as TenantRow;
}

// Resolve the tenant from an incoming request.
// Priority: domain match → ?tenant= param (dev only) → DEFAULT_TENANT env
export async function resolveTenant(req: IncomingMessage): Promise<TenantRow | null> {
  const host = (req.headers['x-forwarded-host'] as string | undefined)
    ?? (req.headers['host'] as string | undefined)
    ?? '';
  const domain = host.split(':')[0].toLowerCase();

  if (domain && domain !== 'localhost') {
    const byDomain = await fetchByDomain(domain);
    if (byDomain) return byDomain;
  }

  // Dev fallbacks
  const url = new URL(req.url ?? '/', `http://${host || 'localhost'}`);
  const tenantParam = url.searchParams.get('tenant');
  if (tenantParam) return fetchBySlug(tenantParam);

  const defaultSlug = process.env.DEFAULT_TENANT;
  if (defaultSlug) return fetchBySlug(defaultSlug);

  return null;
}

// Parse and validate the public (non-secret) config of a tenant
export function toPublicConfig(tenant: TenantRow) {
  return TenantPublicConfigSchema.parse({
    id:       tenant.id,
    slug:     tenant.slug,
    name:     tenant.name,
    theme:    tenant.theme,
    assets:   tenant.assets,
    contact:  tenant.contact,
    copy:     tenant.copy,
    tracking: tenant.tracking,
    team:     tenant.team,
  });
}
