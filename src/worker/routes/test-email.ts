import { Hono } from "hono";

const REPORT_RECIPIENTS = [
  'ana.modolo@unlockedtravel.com.br',
  'gilmara.langner@unlockedtravel.com.br',
  'rebeca@unlockedtravel.com.br',
  'sac@unlockedtravel.com.br',
  'contas.receber@unlockedtravel.com.br',
];

function generateDailyReportHTML(stats: { yesterday: number; date: string }): string {
  const isZero = stats.yesterday === 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
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
      <p style="margin: 8px 0 4px; opacity: 0.85; font-size: 13px;">Quiz: Estados Unidos - Vistos</p>
      <p>${stats.date}</p>
    </div>
    <div class="content">
      <div class="stat-box">
        <p class="stat-number">${stats.yesterday}</p>
        <p class="stat-label">Novos leads ontem</p>
      </div>
      ${isZero ? `
        <div class="alert">
          <strong>⚠️ Atenção:</strong> Não houve novos leads no dia de ontem. Verifique se há algum problema com o sistema ou com as campanhas de marketing.
        </div>
      ` : ''}
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Este relatório é enviado automaticamente todos os dias às 8h (horário de Brasília).
      </p>
    </div>
    <div class="footer">
      <p>Unlocked Consultoria Migratória<br>Sistema Automatizado de Relatórios</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

const app = new Hono<{ Bindings: Env }>();

// Send test daily report (no auth required - internal endpoint)
app.post("/send", async (c) => {
  try {
    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Get yesterday's lead count
    const yesterdayResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE created_at >= datetime(?) AND created_at <= datetime(?)
    `).bind(
      yesterday.toISOString(),
      yesterdayEnd.toISOString()
    ).first();

    const yesterdayCount = (yesterdayResult?.count as number) || 0;

    // Generate email HTML
    const dailyHTML = generateDailyReportHTML({
      yesterday: yesterdayCount,
      date: yesterday.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    });

    // Send email
    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': c.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Unlocked Reports',
          email: 'contato@unlockedtravel.com.br'
        },
        to: REPORT_RECIPIENTS.map(email => ({ email })),
        subject: `[TESTE] ${yesterdayCount === 0 
          ? '⚠️ Alerta: Nenhum lead ontem - Relatório Diário'
          : `📊 ${yesterdayCount} novo${yesterdayCount !== 1 ? 's' : ''} lead${yesterdayCount !== 1 ? 's' : ''} ontem - Relatório Diário`}`,
        htmlContent: dailyHTML,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send test report:', errorText);
      return c.json({ 
        success: false, 
        error: 'Failed to send email',
        details: errorText 
      }, 500);
    }

    return c.json({ 
      success: true,
      message: 'Test email sent successfully',
      leadCount: yesterdayCount,
      recipients: REPORT_RECIPIENTS
    });
  } catch (error) {
    console.error('Error sending test report:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to send test report' 
    }, 500);
  }
});

export default app;
