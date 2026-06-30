import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../_lib/supabase.js';
import { requireAuth } from '../../../_lib/auth.js';

// Vercel parses multipart automatically when Content-Type is multipart/form-data
// but we receive it as a Buffer via req.body with the raw bytes.
// We use the built-in formidable-compatible approach via the raw body.

const ALLOWED_TYPES: Record<string, string> = {
  'image/png':  '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

const ASSET_KEYS = ['logoUrl', 'logoLight', 'ogImageUrl', 'ebookUrl', 'proofImage'] as const;
type AssetKey = typeof ASSET_KEYS[number];

export const config = { api: { bodyParser: false, responseLimit: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res, 'super_admin');
  if (!auth) return;

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = Number(req.query.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, slug, assets')
    .eq('id', id)
    .single();

  if (tenantErr || !tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  const bucket = 'tenant-assets';
  const currentAssets = (tenant.assets as Record<string, unknown>) ?? {};

  // ── DELETE ──────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const assetKeyDel = req.query.assetKey as string;
    if (!assetKeyDel || !ASSET_KEYS.includes(assetKeyDel as AssetKey)) {
      return res.status(400).json({ error: `assetKey inválido. Use: ${ASSET_KEYS.join(', ')}` });
    }

    if (assetKeyDel === 'proofImage') {
      const urlToDel = req.query.url as string;
      if (!urlToDel) return res.status(400).json({ error: 'url obrigatória para proofImage' });
      const existing = Array.isArray(currentAssets.proofImages) ? currentAssets.proofImages as string[] : [];
      const updated = existing.filter(u => u !== urlToDel);
      const pathMatch = urlToDel.match(/tenant-assets\/(.+)$/);
      if (pathMatch) await supabase.storage.from(bucket).remove([pathMatch[1]]);
      await supabase.from('tenants').update({ assets: { ...currentAssets, proofImages: updated } }).eq('id', id);
    } else {
      const exts = Object.values(ALLOWED_TYPES);
      await supabase.storage.from(bucket).remove(exts.map(e => `${tenant.slug}/${assetKeyDel}${e}`));
      const updated = { ...currentAssets };
      delete updated[assetKeyDel];
      await supabase.from('tenants').update({ assets: updated }).eq('id', id);
    }

    return res.status(200).json({ success: true });
  }

  // ── POST (upload) ────────────────────────────────────────────────────
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks);

  const contentType = req.headers['content-type'] ?? '';
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return res.status(400).json({ error: 'Content-Type deve ser multipart/form-data' });

  const { file, assetKey, mimeType } = parseMultipart(rawBody, boundary);
  if (!file) return res.status(400).json({ error: 'Arquivo não encontrado no body' });
  if (!ASSET_KEYS.includes(assetKey as AssetKey)) return res.status(400).json({ error: `assetKey inválido. Use: ${ASSET_KEYS.join(', ')}` });
  if (!ALLOWED_TYPES[mimeType]) return res.status(400).json({ error: 'Tipo de arquivo não permitido' });

  const ext = ALLOWED_TYPES[mimeType];
  const ts = Date.now();
  const path = `${tenant.slug}/${assetKey}_${ts}${ext}`;

  // Remove old versions of this asset from storage before uploading new one
  if (assetKey !== 'proofImage') {
    const oldExts = Object.values(ALLOWED_TYPES);
    const oldUrl = currentAssets[assetKey] as string | undefined;
    if (oldUrl) {
      const oldPathMatch = oldUrl.match(/tenant-assets\/(.+?)(\?.*)?$/);
      if (oldPathMatch) await supabase.storage.from(bucket).remove([oldPathMatch[1]]);
    } else {
      // Fallback: try removing with all extensions (legacy fixed names)
      await supabase.storage.from(bucket).remove(oldExts.map(e => `${tenant.slug}/${assetKey}${e}`));
    }
  }

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: mimeType, upsert: false });

  if (uploadErr) return res.status(500).json({ error: uploadErr.message });

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

  let updatedAssets: Record<string, unknown>;

  if (assetKey === 'proofImage') {
    const existing = Array.isArray(currentAssets.proofImages) ? currentAssets.proofImages as string[] : [];
    if (!existing.includes(publicUrl)) existing.push(publicUrl);
    updatedAssets = { ...currentAssets, proofImages: existing };
  } else {
    updatedAssets = { ...currentAssets, [assetKey]: publicUrl };
  }

  await supabase.from('tenants').update({ assets: updatedAssets }).eq('id', id);

  return res.status(200).json({ success: true, url: publicUrl, assetKey });
}

function parseMultipart(body: Buffer, boundary: string): { file: Buffer | null; assetKey: string; mimeType: string } {
  const sep = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(body, sep);
  let file: Buffer | null = null;
  let assetKey = '';
  let mimeType = 'application/octet-stream';

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = part.slice(0, headerEnd).toString();
    const content = part.slice(headerEnd + 4);
    // Strip trailing \r\n--
    const data = content.slice(0, content.lastIndexOf('\r\n'));

    const nameMatch = headers.match(/name="([^"]+)"/);
    const name = nameMatch?.[1] ?? '';

    if (name === 'assetKey') {
      assetKey = data.toString().trim();
    } else if (name === 'file') {
      const ctMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
      mimeType = ctMatch?.[1]?.trim() ?? 'application/octet-stream';
      file = data;
    }
  }

  return { file, assetKey, mimeType };
}

function splitBuffer(buf: Buffer, sep: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  let idx = buf.indexOf(sep, start);
  while (idx !== -1) {
    parts.push(buf.slice(start, idx));
    start = idx + sep.length;
    idx = buf.indexOf(sep, start);
  }
  parts.push(buf.slice(start));
  return parts.filter(p => p.length > 4);
}
