import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

// Import report generation functions
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

// SECURITY: Protect all admin routes with authentication
app.use("*", authMiddleware);

// SECURITY: Strict email domain verification - ONLY @unlockedtravel.com.br
app.use("*", async (c, next) => {
  const user = c.get("user");
  
  // Log all access attempts for security monitoring
  console.log(`[SECURITY] Admin access attempt - Email: ${user?.email || 'NO_USER'}, Path: ${c.req.path}, Method: ${c.req.method}`);
  
  // CRITICAL: Block if no user or wrong email domain
  if (!user || !user.email || !user.email.endsWith("@unlockedtravel.com.br")) {
    console.error(`[SECURITY VIOLATION] Unauthorized access blocked - Email: ${user?.email || 'NO_USER'}, Path: ${c.req.path}`);
    return c.json({ 
      error: "Acesso não autorizado. Apenas emails @unlockedtravel.com.br têm permissão.",
      unauthorized: true 
    }, 403);
  }
  
  // Extra validation: ensure email is a string and properly formatted
  const email = String(user.email).toLowerCase().trim();
  if (!email.endsWith("@unlockedtravel.com.br")) {
    console.error(`[SECURITY VIOLATION] Email domain mismatch - Email: ${email}, Path: ${c.req.path}`);
    return c.json({ 
      error: "Domínio de email não autorizado.",
      unauthorized: true 
    }, 403);
  }
  
  console.log(`[SECURITY] Access granted - Email: ${email}, Path: ${c.req.path}`);
  await next();
});

// Get all leads
app.get("/", async (c) => {
  const status = c.req.query("status");
  
  let query = `
    SELECT 
      id, name, phone, email,
      primary_visa, secondary_visa, viability,
      any_eligible, l1a_risk,
      eb2niw_met, eb2niw_total, eb2niw_pct,
      eb1a_met, eb1a_total, eb1a_pct,
      l1a_met, l1a_total, l1a_pct,
      o1a_met, o1a_total, o1a_pct,
      tags, status, notes, assigned_to, purpose, priority, created_at
    FROM leads
  `;
  
  if (status) {
    query += ` WHERE status = ?`;
  }
  
  query += ` ORDER BY created_at DESC`;
  
  try {
    const result = status 
      ? await c.env.DB.prepare(query).bind(status).all()
      : await c.env.DB.prepare(query).all();
    
    return c.json({ 
      success: true,
      leads: result.results 
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return c.json({ success: false, error: 'Failed to fetch leads' }, 500);
  }
});

// Get single lead with full details
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  
  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM leads WHERE id = ?
    `).bind(id).first();
    
    if (!result) {
      return c.json({ success: false, error: 'Lead not found' }, 404);
    }
    
    // Parse JSON fields
    const answers = JSON.parse(result.answers as string);
    
    // Reconstruct visa criteria from answers
    const a = answers;
    
    const eb2niw = {
      criteria: [
        { name: 'Grau avançado ou equivalente',
          met: a.education==='phd'||a.education==='masters'||a.education==='postgrad'||
               (a.education==='bachelors'&&(a.experience==='5to10'||a.experience==='10plus')) },
        { name: 'Experiência relevante na área',
          met: a.experience==='10plus'||a.experience==='5to10'||a.experience==='3to5' },
        { name: 'Histórico de projetos com impacto',
          met: a.projects==='led_major'||a.projects==='participated' },
        { name: 'Publicações ou produção acadêmica',
          met: a.publications==='books_and_articles'||a.publications==='books'||a.publications==='articles'||a.publications==='few' },
        { name: 'Reconhecimento profissional',
          met: a.awards==='international'||a.awards==='national'||a.awards==='regional' },
        { name: 'Atuação independente ou especializada',
          met: a.company==='own_company'||a.company==='freelancer'||a.company==='specialist' },
      ]
    };

    const eb1a = {
      criteria: [
        { name: 'Prêmios nacionais ou internacionais',
          met: a.awards==='international'||a.awards==='national' },
        { name: 'Membro de associações de excelência',
          met: (a.awards==='international'||a.awards==='national')&&(a.experience==='10plus'||a.experience==='5to10') },
        { name: 'Material publicado sobre seu trabalho',
          met: a.awards==='international'||a.awards==='national'||a.awards==='regional' },
        { name: 'Atuação como avaliador de outros profissionais',
          met: (a.experience==='10plus')&&(a.company==='executive'||a.company==='own_company'||a.publications==='books_and_articles'||a.publications==='books'||a.publications==='articles') },
        { name: 'Contribuições originais de grande importância',
          met: a.projects==='led_major'||(a.projects==='participated'&&(a.publications==='books_and_articles'||a.publications==='books'||a.publications==='articles')) },
        { name: 'Autoria de artigos ou livros',
          met: a.publications==='books_and_articles'||a.publications==='books'||a.publications==='articles' },
        { name: 'Exposições ou demonstrações do trabalho',
          met: false },
        { name: 'Papel de liderança em organizações de destaque',
          met: (a.company==='executive'||a.company==='own_company')&&(a.company_size==='50plus'||a.company_size==='10to50') },
        { name: 'Remuneração elevada em relação a outros na área',
          met: (a.experience==='10plus'||a.experience==='5to10')&&(a.company==='executive'||a.company==='own_company') },
        { name: 'Sucesso comercial na área de atuação',
          met: a.projects==='led_major'&&(a.company==='own_company') },
      ]
    };

    const l1a = {
      criteria: [
        { name: 'Empresa no exterior com funcionários',
          met: (a.company==='own_company'||a.company==='executive')&&(a.company_size!=='solo') },
        { name: 'Cargo executivo ou gerencial (1+ ano)',
          met: (a.company==='own_company'||a.company==='executive')&&(a.experience!=='less3') },
        { name: 'Operação nos EUA ou plano de abrir',
          met: a.us_plans==='yes'||a.us_plans==='open' },
        { name: 'Relação qualificante entre empresas',
          met: a.us_plans==='yes'&&(a.company==='own_company'||a.company==='executive') },
        { name: 'Estrutura organizacional sustenta o cargo',
          met: a.company_size==='50plus'||a.company_size==='10to50' },
      ]
    };

    const o1a = {
      criteria: [
        { name: 'Prêmios nacionais ou internacionais',
          met: a.awards==='international'||a.awards==='national' },
        { name: 'Membro de associações que exigem excelência',
          met: (a.awards==='international'||a.awards==='national')&&a.experience!=='less3' },
        { name: 'Material publicado sobre seu trabalho',
          met: a.awards!=='none'&&(a.publications==='books_and_articles'||a.publications==='books'||a.publications==='articles') },
        { name: 'Atuação como avaliador de outros profissionais',
          met: a.experience==='10plus'&&(a.company==='executive'||a.company==='own_company') },
        { name: 'Contribuições originais de importância',
          met: a.projects==='led_major'||a.publications==='books_and_articles'||a.publications==='books' },
        { name: 'Autoria de artigos ou publicações',
          met: a.publications==='books_and_articles'||a.publications==='books'||a.publications==='articles' },
        { name: 'Emprego em posição crítica ou de destaque',
          met: (a.company==='executive'||a.company==='own_company')&&(a.company_size==='50plus'||a.company_size==='10to50') },
        { name: 'Remuneração elevada na área',
          met: (a.experience==='10plus')&&(a.company==='executive'||a.company==='own_company'||a.company==='specialist') },
      ]
    };
    
    const lead = {
      ...result,
      answers,
      tags: (result.tags as string).split(','),
      visa_criteria: {
        eb2niw: eb2niw.criteria,
        eb1a: eb1a.criteria,
        l1a: l1a.criteria,
        o1a: o1a.criteria,
      }
    };
    
    return c.json({ 
      success: true,
      lead 
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return c.json({ success: false, error: 'Failed to fetch lead' }, 500);
  }
});

// Update lead notes
app.patch("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const { notes } = await c.req.json();

  await c.env.DB.prepare("UPDATE leads SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(notes, id)
    .run();

  return c.json({ success: true });
});

// Update lead status
app.patch("/:id/status", async (c) => {
  const id = c.req.param("id");
  const { status } = await c.req.json();
  
  const validStatuses = ['novo', 'transferido'];
  if (!validStatuses.includes(status)) {
    return c.json({ success: false, error: 'Invalid status' }, 400);
  }
  
  try {
    await c.env.DB.prepare(`
      UPDATE leads 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating lead:', error);
    return c.json({ success: false, error: 'Failed to update lead' }, 500);
  }
});

// Update lead assigned_to
app.patch("/:id/assigned", async (c) => {
  const id = c.req.param("id");
  const { assigned_to } = await c.req.json();
  
  const validAssignees = ['Amanda', 'Julia', 'Lênia', 'Isabela', 'Cristiane', ''];
  if (!validAssignees.includes(assigned_to)) {
    return c.json({ success: false, error: 'Invalid assignee' }, 400);
  }
  
  try {
    await c.env.DB.prepare(`
      UPDATE leads 
      SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(assigned_to || null, id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating lead:', error);
    return c.json({ success: false, error: 'Failed to update lead' }, 500);
  }
});

// Delete lead
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  
  try {
    await c.env.DB.prepare(`
      DELETE FROM leads WHERE id = ?
    `).bind(id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return c.json({ success: false, error: 'Failed to delete lead' }, 500);
  }
});

// Test endpoint: Send daily report with yesterday's actual data
app.post("/test-daily-report", async (c) => {
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
