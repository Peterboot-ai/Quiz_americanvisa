import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from './_lib/supabase.js';
import { resolveTenant } from './_lib/tenant.js';
import { generateEmailHTML } from './_lib/email-template.js';
import { AssetsSchema, ContactSchema, CopySchema, ThemeSchema } from './_lib/tenant-schema.js';

const leadSchema = z.object({
  contact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
  result: z.object({
    primary: z.string(),
    secondary: z.string(),
    viability: z.string(),
    tags: z.array(z.string()),
    eligibility: z.object({
      eb2niw: z.boolean(),
      eb1a: z.boolean(),
      l1a: z.boolean(),
      o1a: z.boolean(),
    }),
    anyEligible: z.boolean(),
    l1aRisk: z.boolean(),
    companySize: z.string(),
    visas: z.object({
      eb2niw: z.object({ met: z.number(), total: z.number(), pct: z.number() }),
      eb1a:   z.object({ met: z.number(), total: z.number(), pct: z.number() }),
      l1a:    z.object({ met: z.number(), total: z.number(), pct: z.number() }),
      o1a:    z.object({ met: z.number(), total: z.number(), pct: z.number() }),
    }),
  }),
  answers: z.record(z.string()),
  purpose: z.string().optional(),
  priority: z.string().optional(),
  timestamp: z.string(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tenant = await resolveTenant(req);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant não encontrado' });
  }

  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
  }

  const { contact, result, answers, purpose, priority } = parsed.data;

  try {
    const { data: inserted, error: insertError } = await supabase
      .from('leads')
      .insert({
        tenant_id:      tenant.id,
        name:           contact.name,
        phone:          contact.phone,
        email:          contact.email,
        primary_visa:   result.primary,
        secondary_visa: result.secondary,
        viability:      result.viability,
        any_eligible:   result.anyEligible,
        l1a_risk:       result.l1aRisk,
        company_size:   result.companySize,
        eb2niw_met:     result.visas.eb2niw.met,
        eb2niw_total:   result.visas.eb2niw.total,
        eb2niw_pct:     result.visas.eb2niw.pct,
        eb1a_met:       result.visas.eb1a.met,
        eb1a_total:     result.visas.eb1a.total,
        eb1a_pct:       result.visas.eb1a.pct,
        l1a_met:        result.visas.l1a.met,
        l1a_total:      result.visas.l1a.total,
        l1a_pct:        result.visas.l1a.pct,
        o1a_met:        result.visas.o1a.met,
        o1a_total:      result.visas.o1a.total,
        o1a_pct:        result.visas.o1a.pct,
        tags:           result.tags.join(','),
        answers,
        purpose:        purpose ?? null,
        priority:       priority ?? null,
        status:         'novo',
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // Send email — fetch fresh tenant data (brevo_api_key not cached)
    const { data: freshTenant } = await supabase
      .from('tenants')
      .select('brevo_api_key, sender_email, sender_name, theme, assets, contact, copy')
      .eq('id', tenant.id)
      .single();

    if (!freshTenant?.brevo_api_key || !freshTenant?.sender_email) {
      return res.status(200).json({ success: true, leadId: inserted.id });
    }
    try {
      const theme    = ThemeSchema.parse(freshTenant.theme);
      const assets   = AssetsSchema.parse(freshTenant.assets);
      const contact_ = ContactSchema.parse(freshTenant.contact);
      const copy     = CopySchema.parse(freshTenant.copy);

      const emailHTML = generateEmailHTML({
        name:         contact.name,
        email:        contact.email,
        primary_visa: result.primary,
        visas:        result.visas,
        any_eligible: result.anyEligible,
        l1a_risk:     result.l1aRisk,
        tenant: { name: tenant.name, theme, assets, contact: contact_, copy },
      });

      const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': freshTenant.brevo_api_key ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: freshTenant.sender_name ?? tenant.name, email: freshTenant.sender_email ?? '' },
          to: [{ email: contact.email, name: contact.name }],
          subject: `${contact.name.split(' ')[0]}, seu resultado está pronto — ${tenant.name}`,
          htmlContent: emailHTML,
        }),
      });

      if (!emailRes.ok) {
        console.error('Brevo error:', await emailRes.text());
      }
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
    }

    return res.status(200).json({ success: true, leadId: inserted.id });
  } catch (err) {
    console.error('Error saving lead:', err);
    return res.status(500).json({ success: false, error: 'Falha ao salvar lead' });
  }
}
