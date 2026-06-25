import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';

function generateDailyReportHTML(stats: { yesterday: number; date: string; tenantName: string }): string {
  const isZero = stats.yesterday === 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1B3A6B 0%, #0F1A2E 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 40px 30px; }
    .stat-box { background: ${isZero ? '#FEF2F2' : '#F0F9FF'}; border-left: 4px solid ${isZero ? '#DC2626' : '#D4A847'}; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .stat-number { font-size: 48px; font-weight: bold; color: ${isZero ? '#DC2626' : '#1B3A6B'}; margin: 0; }
    .stat-label { font-size: 14px; color: #666; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .alert { background: #FEF2F2; border: 1px solid #FEE2E2; color: #991B1B; padding: 16px; border-radius: 4px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório Diário de Leads</h1>
      <p style="margin: 8px 0 4px; opacity: 0.85; font-size: 13px;">${stats.tenantName}</p>
      <p>${stats.date}</p>
    </div>
    <div class="content">
      <div class="stat-box">
        <p class="stat-number">${stats.yesterday}</p>
        <p class="stat-label">Novos leads ontem</p>
      </div>
      ${isZero ? `
        <div class="alert">
          <strong>⚠️ Atenção:</strong> Não houve novos leads no dia de ontem.
        </div>
      ` : ''}
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Este relatório é enviado automaticamente todos os dias às 8h (horário de Brasília).
      </p>
    </div>
    <div class="footer">
      <p>${stats.tenantName}<br>Sistema Automatizado de Relatórios</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate CRON_SECRET to prevent unauthorized triggers
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const dateLabel = yesterday.toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Fetch all active tenants with Brevo configured
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, brevo_api_key, sender_email, sender_name, report_recipients')
    .eq('active', true);

  if (tenantsError || !tenants) {
    console.error('Error fetching tenants:', tenantsError);
    return res.status(500).json({ error: 'Falha ao buscar tenants' });
  }

  const results: Array<{ tenant: string; sent: boolean; leadCount?: number; error?: string }> = [];

  for (const tenant of tenants) {
    if (!tenant.brevo_api_key || !tenant.report_recipients?.length) {
      results.push({ tenant: tenant.name, sent: false, error: 'Brevo ou destinatários não configurados' });
      continue;
    }

    try {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .gte('created_at', yesterday.toISOString())
        .lte('created_at', yesterdayEnd.toISOString());

      const yesterdayCount = count ?? 0;

      const html = generateDailyReportHTML({
        yesterday: yesterdayCount,
        tenantName: tenant.name,
        date: dateLabel,
      });

      const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': tenant.brevo_api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: `${tenant.sender_name ?? tenant.name} Reports`, email: tenant.sender_email ?? '' },
          to: (tenant.report_recipients as string[]).map((email: string) => ({ email })),
          subject: yesterdayCount === 0
            ? `⚠️ Nenhum lead ontem — ${tenant.name}`
            : `📊 ${yesterdayCount} lead${yesterdayCount !== 1 ? 's' : ''} ontem — ${tenant.name}`,
          htmlContent: html,
        }),
      });

      if (!emailRes.ok) {
        const detail = await emailRes.text();
        console.error(`Brevo error for ${tenant.name}:`, detail);
        results.push({ tenant: tenant.name, sent: false, error: detail });
      } else {
        results.push({ tenant: tenant.name, sent: true, leadCount: yesterdayCount });
      }
    } catch (err) {
      console.error(`Error processing tenant ${tenant.name}:`, err);
      results.push({ tenant: tenant.name, sent: false, error: String(err) });
    }
  }

  return res.status(200).json({ success: true, date: dateLabel, results });
}
