import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../_lib/auth.js';

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res, 'super_admin');
  if (!auth) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string };
  if (!imageBase64 || !mimeType) return res.status(400).json({ error: 'imageBase64 e mimeType obrigatórios' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada' });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Analise esta logo e gere uma paleta de cores para um site profissional de consultoria migratória.
Retorne APENAS um JSON válido com este formato exato, sem texto adicional:
{
  "navy": "#hexcolor",
  "navyAlt": "#hexcolor",
  "gold": "#hexcolor",
  "goldAlt": "#hexcolor",
  "cream": "#hexcolor",
  "creamAlt": "#hexcolor",
  "flagBlue": "#hexcolor",
  "flagRed": "#hexcolor"
}

Regras:
- navy: cor principal escura da logo (para headers, textos principais)
- navyAlt: versão ligeiramente mais clara do navy
- gold: cor de destaque/acento da logo (para CTAs, destaques)
- goldAlt: versão mais escura do gold
- cream: fundo claro neutro que combine com a logo (quase branco)
- creamAlt: versão levemente mais escura do cream
- flagBlue: azul que combine com a identidade (pode ser o navy)
- flagRed: vermelho que combine com a identidade (se não houver vermelho, use um tom escuro)`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(500).json({ error: `Claude API error: ${err}` });
  }

  const result = await response.json() as { content: Array<{ type: string; text: string }> };
  const text = result.content?.[0]?.text ?? '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const palette = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, palette });
  } catch {
    return res.status(500).json({ error: 'Não foi possível extrair paleta da resposta', raw: text });
  }
}
