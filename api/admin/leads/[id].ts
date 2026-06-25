import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase.js';
import { requireAuth } from '../../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;

  if (req.method === 'GET') {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }

    // Validate tenant ownership (super_admin bypasses)
    if (auth.role !== 'super_admin' && auth.tenant && lead.tenant_id !== auth.tenant.id) {
      return res.status(403).json({ success: false, error: 'Acesso não autorizado' });
    }

    // Parse answers and reconstruct visa criteria (ported from original admin.ts)
    const answers = lead.answers as Record<string, string>;
    const a = answers;

    const visa_criteria = {
      eb2niw: [
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
      ],
      eb1a: [
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
        { name: 'Exposições ou demonstrações do trabalho', met: false },
        { name: 'Papel de liderança em organizações de destaque',
          met: (a.company==='executive'||a.company==='own_company')&&(a.company_size==='50plus'||a.company_size==='10to50') },
        { name: 'Remuneração elevada em relação a outros na área',
          met: (a.experience==='10plus'||a.experience==='5to10')&&(a.company==='executive'||a.company==='own_company') },
        { name: 'Sucesso comercial na área de atuação',
          met: a.projects==='led_major'&&(a.company==='own_company') },
      ],
      l1a: [
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
      ],
      o1a: [
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
      ],
    };

    return res.status(200).json({
      success: true,
      lead: {
        ...lead,
        tags: typeof lead.tags === 'string' ? (lead.tags as string).split(',') : lead.tags,
        visa_criteria,
      },
    });
  }

  if (req.method === 'DELETE') {
    // Fetch first to validate tenant ownership
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, tenant_id')
      .eq('id', id)
      .single();

    if (fetchError || !lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }

    if (auth.role !== 'super_admin' && auth.tenant && lead.tenant_id !== auth.tenant.id) {
      return res.status(403).json({ success: false, error: 'Acesso não autorizado' });
    }

    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      console.error('Error deleting lead:', error);
      return res.status(500).json({ success: false, error: 'Falha ao deletar lead' });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
