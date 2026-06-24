import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateEmailHTML } from "../email-template";

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
      eb2niw: z.object({
        met: z.number(),
        total: z.number(),
        pct: z.number(),
      }),
      eb1a: z.object({
        met: z.number(),
        total: z.number(),
        pct: z.number(),
      }),
      l1a: z.object({
        met: z.number(),
        total: z.number(),
        pct: z.number(),
      }),
      o1a: z.object({
        met: z.number(),
        total: z.number(),
        pct: z.number(),
      }),
    }),
  }),
  answers: z.record(z.string()),
  purpose: z.string().optional(),
  priority: z.string().optional(),
  timestamp: z.string(),
});

const app = new Hono<{ Bindings: Env }>();

app.post("/", zValidator("json", leadSchema), async (c) => {
  const data = c.req.valid("json");
  const { contact, result, answers, purpose, priority } = data;

  try {
    // Insert lead into database
    const insertResult = await c.env.DB.prepare(`
      INSERT INTO leads (
        name, phone, email,
        primary_visa, secondary_visa, viability,
        any_eligible, l1a_risk, company_size,
        eb2niw_met, eb2niw_total, eb2niw_pct,
        eb1a_met, eb1a_total, eb1a_pct,
        l1a_met, l1a_total, l1a_pct,
        o1a_met, o1a_total, o1a_pct,
        tags, answers, purpose, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      contact.name,
      contact.phone,
      contact.email,
      result.primary,
      result.secondary,
      result.viability,
      result.anyEligible ? 1 : 0,
      result.l1aRisk ? 1 : 0,
      result.companySize,
      result.visas.eb2niw.met,
      result.visas.eb2niw.total,
      result.visas.eb2niw.pct,
      result.visas.eb1a.met,
      result.visas.eb1a.total,
      result.visas.eb1a.pct,
      result.visas.l1a.met,
      result.visas.l1a.total,
      result.visas.l1a.pct,
      result.visas.o1a.met,
      result.visas.o1a.total,
      result.visas.o1a.pct,
      result.tags.join(','),
      JSON.stringify(answers),
      purpose || null,
      priority || null,
      'novo'
    ).run();

    // Send email with personalized report
    try {
      const emailHTML = generateEmailHTML({
        name: contact.name,
        email: contact.email,
        primary_visa: result.primary,
        visas: result.visas,
        any_eligible: result.anyEligible,
        l1a_risk: result.l1aRisk,
      });

      const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': c.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Unlocked Consultoria',
            email: 'contato@unlockedtravel.com.br'
          },
          to: [{
            email: contact.email,
            name: contact.name
          }],
          subject: `${contact.name.split(' ')[0]}, seu resultado está pronto — Unlocked`,
          htmlContent: emailHTML,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send email:', await emailResponse.text());
      } else {
        console.log('Email sent successfully to:', contact.email);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    return c.json({ 
      success: true,
      message: 'Lead captured successfully',
      leadId: insertResult.meta.last_row_id
    });
  } catch (error) {
    console.error('Error saving lead:', error);
    return c.json({ success: false, error: 'Failed to save lead' }, 500);
  }
});

export default app;
