import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number | null;
}

const answerLabels: Record<string, Record<string, string>> = {
  goal: {
    work: 'Trabalhar na minha área de atuação',
    business: 'Empreender ou expandir negócio',
    research: 'Pesquisa ou carreira acadêmica',
  },
  education: {
    phd: 'Doutorado (PhD)',
    masters: 'Mestrado',
    postgrad: 'Pós-graduação (Especialização / MBA)',
    bachelors: 'Graduação (Bacharelado / Licenciatura)',
    other: 'Outro ou sem diploma superior',
  },
  experience: {
    '10plus': 'Mais de 10 anos',
    '5to10': 'Entre 5 e 10 anos',
    '3to5': 'Entre 3 e 5 anos',
    less3: 'Menos de 3 anos',
  },
  projects: {
    led_major: 'Liderou projetos com resultados significativos',
    participated: 'Participou de projetos importantes',
    small: 'Apenas projetos de menor escala',
    none: 'Ainda não',
  },
  publications: {
    books_and_articles: 'Livros e artigos/papers',
    books: 'Livros publicados',
    articles: 'Artigos ou papers publicados',
    few: 'Poucas publicações',
    none: 'Não tem publicações',
  },
  awards: {
    international: 'Reconhecimento internacional',
    national: 'Reconhecimento nacional',
    regional: 'Reconhecimento regional ou do setor',
    none: 'Ainda não recebeu prêmios',
  },
  company: {
    own_company: 'Dono ou sócio de empresa',
    executive: 'Diretor, gerente ou executivo',
    specialist: 'Especialista ou profissional técnico',
    freelancer: 'Autônomo ou freelancer',
    other_role: 'Outra situação',
  },
  company_size: {
    '50plus': 'Mais de 50 funcionários',
    '10to50': 'Entre 10 e 50 funcionários',
    '1to10': 'Até 10 funcionários',
    solo: 'Trabalha sozinho / não se aplica',
  },
  us_plans: {
    yes: 'Quer levar o negócio para os EUA',
    work_only: 'Prefere atuar como profissional',
    open: 'Aberto a explorar novos horizontes',
  },
  timeline: {
    '6months': 'Nos próximos 6 meses',
    '1year': 'No próximo ano',
    '1to5years': 'Entre 1 e 5 anos',
    exploring: 'Ainda está avaliando',
  },
  purpose: {
    serious: 'Interesse real em imigrar',
    opportunities: 'Buscando oportunidades e avaliando opções',
    curious: 'Apenas curioso sobre o processo',
    exploring: 'Quer entender se tem chances',
  },
  priority: {
    urgent: 'Urgente — quer iniciar o quanto antes',
    '6to8months': 'Dentro de 6 a 8 meses',
    researching: 'Ainda pesquisando e planejando',
    just_knowing: 'Apenas conhecendo o processo',
  },
};

const questionLabels: Record<string, string> = {
  goal: 'Objetivo nos EUA',
  education: 'Formação acadêmica',
  experience: 'Experiência na área',
  company: 'Situação profissional',
  company_size: 'Tamanho da empresa',
  projects: 'Projetos relevantes',
  publications: 'Publicações',
  awards: 'Prêmios / Reconhecimento',
  us_plans: 'Planos nos EUA',
  timeline: 'Prazo para mudança',
  purpose: 'Propósito',
  priority: 'Prioridade',
};

interface SectionConfig {
  title: string;
  icon: string;
  fields: string[];
}

const sections: SectionConfig[] = [
  {
    title: 'Perfil Profissional',
    icon: '📋',
    fields: ['goal', 'education', 'experience', 'company', 'company_size'],
  },
  {
    title: 'Diferencial',
    icon: '⭐',
    fields: ['projects', 'publications', 'awards'],
  },
  {
    title: 'Planos e Interesse',
    icon: '🎯',
    fields: ['us_plans', 'timeline', 'purpose', 'priority'],
  },
];

function translateAnswer(field: string, value: string): string {
  return answerLabels[field]?.[value] || value;
}

export function LeadDetailModal({ isOpen, onClose, leadId }: LeadDetailModalProps) {
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !leadId) {
      setLead(null);
      return;
    }

    setLoading(true);
    fetch(`/api/admin/leads/${leadId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLead(data.lead);
        }
      })
      .catch((err) => {
        console.error('Error fetching lead details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, leadId]);

  const answers: Record<string, string> = lead?.answers || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#1B2541] flex items-center justify-between">
            <span>Perfil do Lead</span>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B2541] mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Carregando perfil...</p>
          </div>
        ) : lead ? (
          <div className="mt-2">
            {/* Cabeçalho com dados de contato */}
            <div className="mb-6 p-4 bg-[#F0EDE8] rounded-lg">
              <h3 className="font-bold text-lg text-[#1B2541] mb-2">{lead.name}</h3>
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 min-w-[65px]">Telefone:</span>
                  <a href={`https://wa.me/55${String(lead.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#1B2541] font-medium hover:text-[#D4A847] underline">
                    {lead.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 min-w-[65px]">Email:</span>
                  <span className="text-[#1B2541] font-medium break-all">{lead.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 min-w-[65px]">Data:</span>
                  <span className="text-[#1B2541] font-medium">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Scores resumidos */}
            <div className="mb-6 grid grid-cols-4 gap-3">
              {[
                { label: 'EB-2 NIW', met: lead.eb2niw_met, total: lead.eb2niw_total },
                { label: 'EB-1A', met: lead.eb1a_met, total: lead.eb1a_total },
                { label: 'L-1A', met: lead.l1a_met, total: lead.l1a_total },
                { label: 'O-1A', met: lead.o1a_met, total: lead.o1a_total },
              ].map((visa) => (
                <div key={visa.label} className="text-center p-3 bg-white rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">{visa.label}</div>
                  <div className="text-lg font-bold text-[#1B2541]">
                    {visa.met}<span className="text-gray-400 text-sm">/{visa.total}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Seções de respostas */}
            {sections.map((section) => (
              <div key={section.title} className="mb-5">
                <h4 className="text-sm font-semibold text-[#1B2541] mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <span>{section.icon}</span>
                  {section.title}
                </h4>
                <div className="space-y-2">
                  {section.fields.map((field) => {
                    const value = answers[field];
                    if (!value) return null;
                    return (
                      <div
                        key={field}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100"
                      >
                        <span className="text-xs text-gray-500 min-w-[140px] pt-0.5">
                          {questionLabels[field]}
                        </span>
                        <span className="text-sm font-medium text-[#1B2541]">
                          {translateAnswer(field, value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Nota de rodapé */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">
                Respostas fornecidas pelo lead no questionário de elegibilidade.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Erro ao carregar dados do lead.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
