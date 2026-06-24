// Scheduled tasks for automated reports
// Runs daily at 8am Brazil time (11:00 UTC) and weekly on Mondays

interface DailyStats {
  date: string;
  count: number;
}

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

function generateWeeklyReportHTML(weekStats: DailyStats[], total: number): string {
  const maxCount = Math.max(...weekStats.map(s => s.count), 1);
  
  const chartBars = weekStats.map(stat => {
    const heightPct = (stat.count / maxCount) * 100;
    const dayName = new Date(stat.date).toLocaleDateString('pt-BR', { weekday: 'short' });
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <div style="color: #666; font-size: 16px; font-weight: bold;">${stat.count}</div>
        <div style="width: 100%; height: 150px; display: flex; align-items: flex-end; justify-content: center;">
          <div style="width: 60%; background: linear-gradient(180deg, #D4A847 0%, #B8923D 100%); border-radius: 4px 4px 0 0; height: ${heightPct}%;"></div>
        </div>
        <div style="color: #888; font-size: 12px; text-transform: capitalize;">${dayName}</div>
        <div style="color: #999; font-size: 11px;">${new Date(stat.date).getDate()}/${new Date(stat.date).getMonth() + 1}</div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1B3A6B 0%, #0F1A2E 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 40px 30px; }
    .summary { background: #F0F9FF; border-left: 4px solid #D4A847; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .summary-number { font-size: 36px; font-weight: bold; color: #1B3A6B; margin: 0; }
    .summary-label { font-size: 14px; color: #666; margin: 8px 0 0; }
    .chart { background: #fafafa; padding: 30px 20px; border-radius: 8px; margin: 30px 0; }
    .chart-title { font-size: 16px; font-weight: 600; color: #333; margin: 0 0 20px; text-align: center; }
    .footer { background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 Relatório Semanal de Leads</h1>
      <p style="margin: 8px 0 4px; opacity: 0.85; font-size: 13px;">Quiz: Estados Unidos - Vistos</p>
      <p>Últimos 7 dias</p>
    </div>
    <div class="content">
      <div class="summary">
        <p class="summary-number">${total}</p>
        <p class="summary-label">Total de leads nos últimos 7 dias</p>
      </div>
      
      <div class="chart">
        <h3 class="chart-title">Leads por dia</h3>
        <div style="display: flex; gap: 10px; align-items: flex-end;">
          ${chartBars}
        </div>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Este relatório semanal é enviado automaticamente todas as segundas-feiras às 8h (horário de Brasília).
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

async function sendEmail(env: Env, recipients: string[], subject: string, html: string) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Unlocked Reports',
          email: 'contato@unlockedtravel.com.br'
        },
        to: recipients.map(email => ({ email })),
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send report email:', await response.text());
      return false;
    }
    
    console.log('Report email sent successfully to:', recipients.join(', '));
    return true;
  } catch (error) {
    console.error('Error sending report email:', error);
    return false;
  }
}

export async function handleScheduled(env: Env, scheduledTime: Date) {
  console.log('Running scheduled task at:', scheduledTime);

  // Get current date in Brazil timezone
  const nowBrazil = new Date(scheduledTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dayOfWeek = nowBrazil.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate yesterday's date
  const yesterday = new Date(nowBrazil);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  // Get yesterday's lead count
  const yesterdayResult = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM leads
    WHERE created_at >= datetime(?) AND created_at <= datetime(?)
  `).bind(
    yesterday.toISOString(),
    yesterdayEnd.toISOString()
  ).first();

  const yesterdayCount = (yesterdayResult?.count as number) || 0;

  // Send daily report
  const dailyHTML = generateDailyReportHTML({
    yesterday: yesterdayCount,
    date: yesterday.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  });

  await sendEmail(
    env,
    REPORT_RECIPIENTS,
    yesterdayCount === 0 
      ? '⚠️ Alerta: Nenhum lead ontem - Relatório Diário'
      : `📊 ${yesterdayCount} novo${yesterdayCount !== 1 ? 's' : ''} lead${yesterdayCount !== 1 ? 's' : ''} ontem - Relatório Diário`,
    dailyHTML
  );

  // Send weekly report on Mondays (dayOfWeek === 1)
  if (dayOfWeek === 1) {
    const weekStats: DailyStats[] = [];
    let weekTotal = 0;

    // Get stats for last 7 days
    for (let i = 6; i >= 0; i--) {
      const day = new Date(yesterday);
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const result = await env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM leads
        WHERE created_at >= datetime(?) AND created_at <= datetime(?)
      `).bind(
        day.toISOString(),
        dayEnd.toISOString()
      ).first();

      const count = (result?.count as number) || 0;
      weekTotal += count;

      weekStats.push({
        date: day.toISOString(),
        count
      });
    }

    const weeklyHTML = generateWeeklyReportHTML(weekStats, weekTotal);

    await sendEmail(
      env,
      REPORT_RECIPIENTS,
      `📈 Relatório Semanal - ${weekTotal} leads nos últimos 7 dias`,
      weeklyHTML
    );
  }
}
