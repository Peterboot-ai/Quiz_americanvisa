import { useState, useEffect } from 'react';
import { useTenant } from '@/react-app/contexts/TenantContext';

const Quiz = () => {
  const { tenant, slug, loading } = useTenant();
  const basePath = slug ? `/p/${slug}` : '/quiz';

  if (loading) return null;
  const [phase, setPhase] = useState('hero');
  const [qIdx, setQIdx] = useState(0);
  const [ans, setAns] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [err, setErr] = useState('');
  const [dir, setDir] = useState('fwd');
  const [proofIdx, setProofIdx] = useState(0);
  const [proofVisible, setProofVisible] = useState(true);
  const [analyzeStep, setAnalyzeStep] = useState(0);

  // Update URL and push to dataLayer when phase or question changes
  useEffect(() => {
    const updateTracking = () => {
      // Update URL
      let url = basePath;
      let stepName = '';
      let progressPercent = 0;

      if (phase === 'hero') {
        url = basePath;
        stepName = 'inicio';
        progressPercent = 0;
      } else if (phase === 'quiz') {
        url = `${basePath}#step-${qIdx + 1}`;
        stepName = `pergunta-${qIdx + 1}`;
        progressPercent = Math.round((qIdx / QS.length) * 100);
      } else if (phase === 'capture') {
        url = `${basePath}#step-captura`;
        stepName = 'captura-dados';
        progressPercent = 90;
      } else if (phase === 'socialProof') {
        url = `${basePath}#step-prova-social`;
        stepName = 'prova-social';
        progressPercent = 85;
      } else if (phase === 'analyzing') {
        url = `${basePath}#step-analisando`;
        stepName = 'analisando';
        progressPercent = 95;
      } else if (phase === 'ready') {
        url = `${basePath}#step-resultado`;
        stepName = 'resultado';
        progressPercent = 100;
      } else if (phase === 'done') {
        url = `${basePath}#step-concluido`;
        stepName = 'concluido';
        progressPercent = 100;
      }

      // Update URL without page reload
      window.history.pushState({}, '', url);

      // Push detailed event to Google Tag Manager dataLayer
      if (typeof window !== 'undefined' && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'quiz_step_view',
          quiz_step: stepName,
          quiz_step_number: phase === 'quiz' ? qIdx + 1 : null,
          quiz_phase: phase,
          quiz_progress_percent: progressPercent,
          quiz_total_questions: QS.length,
          page_path: url,
        });
      }
      
      // Track milestones
      if (phase === 'quiz') {
        const milestones = [
          { step: 3, name: '30% Completo' },
          { step: 5, name: '50% Completo' },
          { step: 7, name: '70% Completo' },
          { step: 10, name: 'Quiz Finalizado' }
        ];
        
        const milestone = milestones.find(m => m.step === qIdx + 1);
        if (milestone && (window as any).dataLayer) {
          (window as any).dataLayer.push({
            event: 'quiz_milestone',
            milestone_name: milestone.name,
            milestone_percent: progressPercent,
          });
        }
      }
    };

    updateTracking();
  }, [phase, qIdx]);

  const defaultProofImages = [
    'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/PROVA-2.png',
    'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/PROVA-1.png',
    'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/PROVA-3.png',
  ];
  const proofImages = (tenant?.assets?.proofImages?.length ? tenant.assets.proofImages : defaultProofImages);

  useEffect(() => {
    if (phase !== 'socialProof') return;
    console.log('[Quiz] Iniciando fase socialProof');
    setProofIdx(0);
    setProofVisible(true);
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx >= proofImages.length) {
        clearInterval(interval);
        console.log('[Quiz] Finalizando socialProof → analyzing');
        setTimeout(() => { setPhase('analyzing'); }, 800);
        return;
      }
      setProofVisible(false);
      setTimeout(() => { setProofIdx(idx); setProofVisible(true); }, 400);
    }, 2000);
    
    // Safety timeout: se não avançar em 10 segundos, força a próxima fase
    const safetyTimeout = setTimeout(() => {
      console.log('[Quiz] Safety timeout ativado em socialProof');
      clearInterval(interval);
      setPhase('analyzing');
    }, 10000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(safetyTimeout);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'analyzing') return;
    console.log('[Quiz] Iniciando fase analyzing');
    setAnalyzeStep(0);
    const steps = [
      { delay: 0 },
      { delay: 2200 },
      { delay: 4400 },
      { delay: 6600 },
    ];
    const timers = steps.map((s, i) =>
      setTimeout(() => {
        if (i < 3) setAnalyzeStep(i);
        else { 
          console.log('[Quiz] Finalizando analyzing → ready');
          setPhase('ready'); 
        }
      }, s.delay)
    );
    
    // Safety timeout: se não avançar em 10 segundos, força a próxima fase
    const safetyTimeout = setTimeout(() => {
      console.log('[Quiz] Safety timeout ativado em analyzing');
      setPhase('ready');
    }, 10000);
    
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(safetyTimeout);
    };
  }, [phase]);

  const QS = [
    { id: 'goal', q: 'Qual é o seu principal objetivo nos Estados Unidos?', sub: 'Isso define o melhor caminho para o seu perfil', opts: [
      { v: 'work', l: 'Trabalhar na minha área de atuação', i: '◆' },
      { v: 'business', l: 'Empreender ou expandir meu negócio', i: '◆' },
      { v: 'research', l: 'Pesquisa ou carreira acadêmica', i: '◆' },
    ]},
    { id: 'education', q: 'Qual é o seu nível de formação acadêmica?', sub: 'Diploma concluído — no Brasil ou no exterior', opts: [
      { v: 'phd', l: 'Doutorado (PhD)', i: '◈' },
      { v: 'masters', l: 'Mestrado', i: '◈' },
      { v: 'postgrad', l: 'Pós-graduação (Especialização / MBA)', i: '◈' },
      { v: 'bachelors', l: 'Graduação (Bacharelado / Licenciatura)', i: '◇' },
      { v: 'other', l: 'Outro ou sem diploma superior', i: '○' },
    ]},
    { id: 'experience', q: 'Quantos anos de experiência você tem na sua área de formação?', sub: 'Experiência profissional diretamente relacionada ao seu diploma', opts: [
      { v: '10plus', l: 'Mais de 10 anos na área', i: '✦' },
      { v: '5to10', l: 'Entre 5 e 10 anos na área', i: '◆' },
      { v: '3to5', l: 'Entre 3 e 5 anos na área', i: '◇' },
      { v: 'less3', l: 'Menos de 3 anos na área', i: '○' },
    ]},
    { id: 'projects', q: 'Você já participou de projetos com resultados expressivos?', sub: 'Reestruturação, redução de custos, crescimento, implementação de sistemas', opts: [
      { v: 'led_major', l: 'Sim — liderei projetos com resultados significativos', i: '◈' },
      { v: 'participated', l: 'Sim — participei de projetos importantes', i: '◆' },
      { v: 'small', l: 'Apenas projetos de menor escala', i: '◇' },
      { v: 'none', l: 'Ainda não', i: '○' },
    ]},
    { id: 'publications', q: 'Você possui publicações acadêmicas, artigos ou livros?', sub: 'Artigos em revistas, papers, capítulos de livro ou livros autorais', opts: [
      { v: 'books_and_articles', l: 'Sim — livros e artigos/papers', i: '◈' },
      { v: 'books', l: 'Sim — livros publicados', i: '◈' },
      { v: 'articles', l: 'Sim — artigos ou papers publicados', i: '◆' },
      { v: 'few', l: 'Poucas publicações', i: '◇' },
      { v: 'none', l: 'Não tenho publicações', i: '○' },
    ]},
    { id: 'awards', q: 'Você já recebeu prêmios ou reconhecimento profissional?', sub: 'Prêmios da indústria, certificações de destaque, cobertura de mídia', opts: [
      { v: 'international', l: 'Sim — reconhecimento internacional', i: '◈' },
      { v: 'national', l: 'Sim — reconhecimento nacional', i: '◆' },
      { v: 'regional', l: 'Reconhecimento regional ou do setor', i: '◇' },
      { v: 'none', l: 'Ainda não recebi prêmios', i: '○' },
    ]},
    { id: 'company', q: 'Qual é a sua situação profissional atual?', sub: 'Selecione a que melhor descreve sua posição', opts: [
      { v: 'own_company', l: 'Sou dono ou sócio de empresa', i: '◆' },
      { v: 'executive', l: 'Diretor, gerente ou executivo', i: '◆' },
      { v: 'specialist', l: 'Especialista ou profissional técnico', i: '◇' },
      { v: 'freelancer', l: 'Autônomo ou freelancer', i: '◇' },
      { v: 'other_role', l: 'Outra situação', i: '○' },
    ]},
    { id: 'company_size', q: 'Quantos funcionários tem a empresa onde você atua?', sub: 'Se for dono, considere sua própria empresa', opts: [
      { v: '50plus', l: 'Mais de 50 funcionários', i: '◈' },
      { v: '10to50', l: 'Entre 10 e 50 funcionários', i: '◆' },
      { v: '1to10', l: 'Até 10 funcionários', i: '◇' },
      { v: 'solo', l: 'Trabalho sozinho / não se aplica', i: '○' },
    ]},
    { id: 'us_plans', q: 'Você pensa em empreender nos Estados Unidos?', sub: 'Abrir ou expandir negócio, atuar como executivo nos EUA', opts: [
      { v: 'yes', l: 'Sim — quero levar meu negócio para os EUA', i: '◈' },
      { v: 'work_only', l: 'Não — prefiro atuar como profissional', i: '◇' },
      { v: 'open', l: 'Estou aberto a explorar novos horizontes', i: '◆' },
    ]},
    { id: 'timeline', q: 'Qual é o seu prazo para mudar para os Estados Unidos?', sub: 'Considerando você e sua família', opts: [
      { v: '6months', l: 'Nos próximos 6 meses', i: '✦' },
      { v: '1year', l: 'No próximo ano', i: '◆' },
      { v: '1to5years', l: 'Entre 1 e 5 anos', i: '◇' },
      { v: 'exploring', l: 'Ainda estou avaliando', i: '○' },
    ]},
    { id: 'purpose', q: 'Qual é o seu verdadeiro propósito ao fazer este quiz?', sub: 'Seja sincero — isso nos ajuda a te atender melhor', opts: [
      { v: 'serious', l: 'Tenho interesse real em imigrar para os EUA', i: '◈' },
      { v: 'opportunities', l: 'Estou buscando oportunidades e avaliando opções', i: '◆' },
      { v: 'curious', l: 'Estou apenas curioso sobre o processo', i: '◇' },
      { v: 'exploring', l: 'Quero entender se tenho chances', i: '○' },
    ]},
    { id: 'priority', q: 'Qual é a sua prioridade em resolver esta situação?', sub: 'Quando você gostaria de dar os primeiros passos práticos', opts: [
      { v: 'urgent', l: 'É urgente — quero iniciar o quanto antes', i: '✦' },
      { v: '6to8months', l: 'Dentro de 6 a 8 meses', i: '◆' },
      { v: 'researching', l: 'Ainda estou pesquisando e planejando', i: '◇' },
      { v: 'just_knowing', l: 'Apenas conhecendo o processo por enquanto', i: '○' },
    ]},
  ];

  const analyze = (a: Record<string, string>) => {
    let tags: string[] = [];

    const eb2niw = {
      total: 6,
      met: 0,
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
    eb2niw.met = eb2niw.criteria.filter(c=>c.met).length;

    const eb1a = {
      total: 10,
      met: 0,
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
    eb1a.met = eb1a.criteria.filter(c=>c.met).length;

    const l1a = {
      total: 5,
      met: 0,
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
    l1a.met = l1a.criteria.filter(c=>c.met).length;

    const o1a = {
      total: 8,
      met: 0,
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
    o1a.met = o1a.criteria.filter(c=>c.met).length;

    if(a.education==='phd')tags.push('phd');else if(a.education==='masters')tags.push('masters');
    else if(a.education==='postgrad')tags.push('postgrad');else if(a.education==='bachelors')tags.push('bachelors');
    else tags.push('no-degree');
    if(a.experience==='10plus')tags.push('senior');else if(a.experience==='5to10')tags.push('mid-senior');
    else if(a.experience==='3to5')tags.push('mid');else tags.push('junior');
    if(a.projects==='led_major')tags.push('major-projects');else if(a.projects==='participated')tags.push('projects');
    if(a.publications==='books_and_articles'){tags.push('books');tags.push('articles');}
    else if(a.publications==='books')tags.push('books');else if(a.publications==='articles')tags.push('articles');
    if(a.awards==='international')tags.push('intl-awards');else if(a.awards==='national')tags.push('national-awards');
    else if(a.awards==='regional')tags.push('regional-awards');
    if(a.company==='own_company')tags.push('business-owner');else if(a.company==='executive')tags.push('executive');
    else if(a.company==='specialist')tags.push('specialist');else if(a.company==='freelancer')tags.push('freelancer');
    if(a.company_size==='50plus')tags.push('large-co');else if(a.company_size==='10to50')tags.push('mid-co');
    if(a.us_plans==='yes')tags.push('us-entrepreneur');else if(a.us_plans==='open')tags.push('open-path');
    if(a.goal==='business')tags.push('goal-business');else if(a.goal==='research')tags.push('goal-research');else tags.push('goal-work');
    if(a.timeline==='6months')tags.push('hot-lead');
    else if(a.timeline==='1year')tags.push('warm-lead');
    else if(a.timeline==='1to5years')tags.push('planning');else tags.push('cold-lead');

    const visas = {
      eb2niw: { met: eb2niw.met, total: eb2niw.total, pct: Math.round((eb2niw.met/eb2niw.total)*100), criteria: eb2niw.criteria },
      eb1a:   { met: eb1a.met, total: eb1a.total, pct: Math.round((eb1a.met/eb1a.total)*100), criteria: eb1a.criteria },
      l1a:    { met: l1a.met, total: l1a.total, pct: Math.round((l1a.met/l1a.total)*100), criteria: l1a.criteria },
      o1a:    { met: o1a.met, total: o1a.total, pct: Math.round((o1a.met/o1a.total)*100), criteria: o1a.criteria },
    };

    const sorted = Object.entries(visas).sort(([,a],[,b]) => b.pct - a.pct || b.met - a.met);
    const primary = sorted[0][0];
    const secondary = sorted[1][0];
    const primaryPct = sorted[0][1].pct;
    const viability = primaryPct >= 60 ? 'high' : primaryPct >= 35 ? 'medium' : 'low';

    const eligibility = {
      eb2niw: eb2niw.met >= 4,
      eb1a: eb1a.met >= 4,
      l1a: l1a.met >= 3 && (a.company_size === '50plus' || a.company_size === '10to50'),
      o1a: o1a.met >= 4,
    };
    const anyEligible = eligibility.eb2niw || eligibility.eb1a || eligibility.l1a || eligibility.o1a;
    const l1aRisk = primary === 'l1a' && (a.company_size === '1to10' || a.company_size === 'solo');
    
    if(!anyEligible) tags.push('not-eligible');
    if(l1aRisk) tags.push('l1a-risk');
    if(anyEligible) tags.push('eligible');

    return { primary, secondary, visas, viability, tags, eligibility, anyEligible, l1aRisk, companySize: a.company_size };
  };

  const startQuiz=()=>{
    setPhase('quiz');
    setQIdx(0);
    setAns({});
    setResult(null);
    setForm({name:'',phone:'',email:''});
    setErr('');
    
    // Facebook Pixel - Track quiz start
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'ViewContent', {
        content_name: 'Quiz Started',
        content_category: 'Quiz'
      });
    }
  };
  const answer=(id: string,v: string)=>{
    console.log('[Quiz] Resposta selecionada:', id, v);
    setDir('fwd');
    const n={...ans,[id]:v};
    setAns(n);
    if(qIdx<QS.length-1)setTimeout(()=>setQIdx(qIdx+1),180);
    else setTimeout(()=>{
      console.log('[Quiz] Última pergunta respondida, calculando resultado');
      const analyzedResult = analyze(n);
      console.log('[Quiz] Resultado calculado:', analyzedResult);
      setResult(analyzedResult);
      setPhase(tenant?.assets?.proofImages?.length ? 'socialProof' : 'analyzing');
    },300);
  };
  const back=()=>{if(qIdx>0){setDir('back');const n={...ans};delete n[QS[qIdx].id];setAns(n);setQIdx(qIdx-1)}};
  
  const submit = async () => {
    if(!form.name.trim()){setErr('Preencha seu nome');return}
    if(form.phone.replace(/\D/g,'').length<10){setErr('Telefone inválido');return}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)){setErr('E-mail inválido');return}
    setErr('');
    
    console.log('[Quiz] Enviando formulário');
    
    try {
      const leadsUrl = slug ? `/api/leads?tenant=${slug}` : '/api/leads';
      const response = await fetch(leadsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: form,
          result,
          answers: ans,
          purpose: ans.purpose,
          priority: ans.priority,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.error('[Quiz] Erro na resposta:', response.status);
        throw new Error('Erro ao enviar');
      }
      
      console.log('[Quiz] Lead enviado com sucesso');
      
      // Facebook Pixel - Track Lead event (pixel initialized by tenant GTM)
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', {
          content_name: 'Quiz American Visa',
          content_category: 'Lead Generation',
          value: 1,
          currency: 'BRL'
        });
      }
      
      // Track form submission success with full details
      if (typeof window !== 'undefined' && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'quiz_completed',
          quiz_lead_email: form.email,
          quiz_lead_name: form.name,
          quiz_lead_phone: form.phone,
          quiz_result_primary: result?.primary || null,
          quiz_result_eb2niw: `${result?.visas?.eb2niw?.met}/${result?.visas?.eb2niw?.total}`,
          quiz_result_eb1a: `${result?.visas?.eb1a?.met}/${result?.visas?.eb1a?.total}`,
          quiz_result_l1a: `${result?.visas?.l1a?.met}/${result?.visas?.l1a?.total}`,
          quiz_result_o1a: `${result?.visas?.o1a?.met}/${result?.visas?.o1a?.total}`,
          quiz_is_potential_client: result?.anyEligible || false,
        });
        
        // Also track as a conversion event
        (window as any).dataLayer.push({
          event: 'conversion',
          conversion_name: 'quiz_lead_captured',
          conversion_value: 1,
        });
      }
      
      setPhase('done');
    } catch (error) {
      console.error('[Quiz] Erro ao enviar:', error);
      setErr('Erro ao enviar. Tente novamente.');
    }
  };
  
  const reset=()=>{setPhase('hero');setQIdx(0);setAns({});setResult(null);setForm({name:'',phone:'',email:''});setErr('');};

  const pct=Math.round((qIdx/QS.length)*100);
  const cq=QS[qIdx];
  const navy='var(--color-navy, #1B2541)';
  const gold='var(--color-gold, #B8860B)';
  const cream='var(--color-cream, #FAFAF8)';

  // Resolved hex values for rgba() where CSS vars can't be used directly
  const t = tenant?.theme;
  const navyHex = t?.navy ?? '#1B2541';
  const goldHex = t?.gold ?? '#B8860B';
  const creamHex = t?.cream ?? '#FAFAF8';
  const flagBlueHex = t?.flagBlue ?? '#1B3A6B';
  const flagRedHex = t?.flagRed ?? '#C41E3A';

  // Dynamic tenant data
  const logoUrl = tenant?.assets?.logoUrl ?? (slug ? null : 'https://019c350b-7614-7690-9325-9a7fb6cd4609.mochausercontent.com/4.png');
  const footerLogoUrl = tenant?.assets?.logoLight ?? (slug ? null : 'https://019c3d04-0273-74b5-a5e8-d649f785d1fc.mochausercontent.com/2.png');
  const waPhone = tenant?.contact?.whatsapp ?? '554197177910';
  const contactEmail = tenant?.contact?.email ?? 'contato@unlockedtravel.com.br';
  const contactInstagram = tenant?.contact?.instagram ?? '@ukconsultoriamigratoria';
  const contactWebsite = tenant?.contact?.website ?? 'unlockedtravel.com.br';
  const tenantName = tenant?.name ?? 'Unlocked';

  const analyzeTexts = [
    'Analisamos as melhores opções para o seu perfil',
    'Pensamos no melhor caminho para você e sua família',
    'Preparamos um guia completo e um e-book gratuito',
  ];

  return (
    <div style={{fontFamily:"'Crimson Pro',Georgia,serif",backgroundColor:creamHex,color:navyHex,minHeight:'100vh',overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        @keyframes fadeUp{from{transform:translateY(30px)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0.99}to{opacity:1}}
        @keyframes slideR{from{transform:translateX(-20px)}to{transform:translateX(0)}}
        @keyframes slideL{from{transform:translateX(20px)}to{transform:translateX(0)}}
        @keyframes scaleIn{from{transform:scale(.94)}to{transform:scale(1)}}
        @keyframes checkPop{0%{transform:scale(0)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes proofIn{from{transform:translateY(20px) scale(.95)}to{transform:translateY(0) scale(1)}}
        @keyframes proofOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-15px)}}

        .opt{background:rgba(27,37,65,.03);border:1.5px solid rgba(27,37,65,.08);padding:1.05rem 1.4rem;border-radius:4px;cursor:pointer;transition:all .28s ease;display:flex;align-items:center;gap:1.1rem;user-select:none}
        .quiz-option{position:relative}
        .quiz-cta{position:relative}
        .quiz-input{position:relative}
        .opt:hover{background:rgba(184,134,11,.08);border-color:rgba(184,134,11,.35);transform:translateX(6px)}
        .opt:active{transform:translateX(6px) scale(.98)}
        .cta{font-family:'Cormorant Garamond',serif;font-size:1.05rem;letter-spacing:.15em;text-transform:uppercase;padding:1.15rem 3rem;background:var(--color-navy,#1B2541);color:var(--color-cream,#FAFAF8);border:none;cursor:pointer;transition:all .3s ease;border-radius:2px;display:inline-flex;align-items:center;gap:.6rem}
        .cta:hover{background:var(--color-gold,#B8860B);letter-spacing:.2em}
        .inp{width:100%;padding:1.05rem 1.2rem;background:white;border:1px solid rgba(27,37,65,.1);color:var(--color-navy,#1B2541);font-family:'Crimson Pro',serif;font-size:1.05rem;margin-bottom:.6rem;transition:all .25s ease;border-radius:2px}
        .inp:focus{outline:none;border-color:var(--color-gold,#B8860B);box-shadow:0 0 0 3px rgba(184,134,11,.1)}
        .inp::placeholder{color:#B0AEB5}
        .flag-bar{height:5px;background:linear-gradient(90deg,var(--color-flag-blue,#1B3A6B) 40%,var(--color-gold,#B8860B) 40%,var(--color-gold,#B8860B) 60%,var(--color-flag-red,#C41E3A) 60%)}
        .texture{position:absolute;top:0;left:0;right:0;bottom:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");opacity:.03;pointer-events:none}
        .waf{position:fixed;bottom:2rem;right:2rem;width:60px;height:60px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(37,211,102,.35);z-index:100;text-decoration:none;transition:all .25s;color:white}
        .waf:hover{transform:translateY(-3px);box-shadow:0 6px 25px rgba(37,211,102,.45)}
        @media(max-width:768px){
          body{font-size:15px}
          .hero-split{grid-template-columns:1fr!important;text-align:center!important;gap:2rem!important;padding:0 1rem!important;padding-top:100px!important}
          .hero-benefits{justify-content:center!important}
          .mobcol{flex-direction:column!important;align-items:stretch!important}
          .mobcol>*{width:100%!important;text-align:center;justify-content:center}
          .cta{font-size:.9rem!important;padding:.95rem 1.8rem!important;letter-spacing:.12em!important}
          h1{font-size:1.75rem!important;line-height:1.2!important}
          h2{font-size:1.35rem!important;line-height:1.25!important}
          h3{font-size:1.15rem!important}
          h5{font-size:.8rem!important}
          .waf{bottom:1rem!important;right:1rem!important;width:50px!important;height:50px!important}
          .opt{padding:.9rem 1.1rem!important;font-size:.95rem!important}
          .inp{padding:.9rem 1rem!important;font-size:.95rem!important}
          section{padding:1rem!important;padding-top:90px!important}
          footer{padding:2rem 1rem!important}
          footer > div > div:first-child{grid-template-columns:1fr!important;text-align:center!important}
          footer img{height:60px!important}
          footer > div > div:last-child{flex-direction:column!important;gap:.5rem!important}
        }
      `}</style>

      <div className="flag-bar"/>
      {phase === 'done' && (
        <a href={`https://wa.me/${waPhone}?text=Olá! Gostaria de saber mais sobre imigrar para os EUA.`} target="_blank" rel="noopener noreferrer" className="waf">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      <section style={{minHeight:'auto',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',position:'relative',overflow:'hidden',paddingTop:'10rem',paddingBottom:'6rem',paddingLeft:'1.5rem',paddingRight:'1.5rem'}}>
        <div className="texture"/>

        <div style={{position:'absolute',top:0,left:0,right:0,padding:'1.3rem 5%',display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:10,borderBottom:'1px solid rgba(0,0,0,.06)',flexWrap:'wrap',gap:'.8rem',backgroundColor:creamHex}}>
          {logoUrl && <img
            src={logoUrl}
            alt={tenantName}
            style={{height:'clamp(48px,10vw,72px)',width:'auto',objectFit:'contain',maxWidth:'180px'}}
          />}
          {(phase==='quiz'||phase==='ready'||phase==='done') && (
            <button 
              onClick={reset} 
              style={{fontFamily:"'Crimson Pro',serif",fontSize:'.8rem',background:'transparent',border:'1px solid rgba(27,37,65,.15)',color:'rgba(27,37,65,.4)',padding:'.45rem .9rem',borderRadius:2,cursor:'pointer',whiteSpace:'nowrap'}}
              onMouseOver={e=>e.currentTarget.style.color=navy} 
              onMouseOut={e=>e.currentTarget.style.color='rgba(27,37,65,.4)'}
              id="btn-quiz-header-restart"
              data-section="header"
              data-action="restart"
              data-element="navigation-button"
            >
              ← Recomeçar
            </button>
          )}
        </div>

        {phase==='hero' && (
          <div className="hero-split" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4rem',maxWidth:1050,width:'100%',alignItems:'start',position:'relative',zIndex:2,padding:'0 1rem',marginTop:'2rem'}}>
            <div style={{textAlign:'left'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.6rem',marginBottom:'1.8rem',justifyContent:'flex-start'}}>
                <span style={{fontSize:'1.5rem'}}>🇺🇸</span>
                <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'.75rem',letterSpacing:'.25em',textTransform:'uppercase',color:gold}}>Estados Unidos</p>
              </div>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(2rem,5vw,3.6rem)',fontWeight:400,lineHeight:1.1,color:navy,letterSpacing:'-.02em',marginBottom:'1.3rem'}}>
                Seu caminho legal<br/>para morar nos <em style={{fontStyle:'italic',color:gold}}>Estados Unidos</em>
              </h1>
              <div style={{width:80,height:1,background:`linear-gradient(90deg,${navy},${gold})`,marginBottom:'1.3rem',margin:'0 auto 1.3rem'}}/>
              <p style={{fontFamily:"'Crimson Pro',serif",fontSize:'clamp(.95rem,2.5vw,1.1rem)',lineHeight:1.8,color:'#5C5A65',fontWeight:300,maxWidth:420,marginBottom:'2.2rem',margin:'0 auto 2.2rem'}}>
                Responda <strong style={{fontWeight:600,color:navy}}>algumas perguntas simples</strong> e receba no seu e-mail uma análise personalizada do melhor caminho para você morar legalmente nos Estados Unidos.
              </p>
              <button 
                className="cta quiz-cta" 
                onClick={startQuiz} 
                style={{fontSize:'clamp(.85rem,2vw,.95rem)',padding:'1rem 2.5rem'}}
                id="btn-quiz-hero-start"
                data-section="hero"
                data-action="start"
                data-element="cta-button"
              >
                Descobrir Minha Elegibilidade →
              </button>
              <p style={{fontFamily:"'Crimson Pro',serif",fontSize:'.8rem',color:'#B0AEB5',marginTop:'1rem',fontStyle:'italic'}}>Gratuito • 2 minutos • Resultado por e-mail</p>
            </div>
            <div className="hero-benefits" style={{display:'flex',flexDirection:'column',gap:'1rem',paddingTop:'3rem'}}>
              {[
                {t:'Moradia legal nos EUA',d:'Processo 100% dentro da lei americana'},
                {t:'Sem necessidade de patrocinador',d:'Você faz a petição de forma independente'},
                {t:'Sua família inclusa no processo',d:'Cônjuge e filhos menores de 21 anos'},
                {t:'Aplique direto do Brasil',d:'Sem precisar estar nos Estados Unidos'},
                {t:'Liberdade para trabalhar',d:'Sem restrições de empregador ou área'},
              ].map((b,i) => (
                <div key={i} style={{display:'flex',gap:'1rem',alignItems:'flex-start',padding:'1rem 1.2rem',background:'rgba(27,37,65,.025)',border:'1px solid rgba(27,37,65,.05)',borderRadius:3}}>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.1rem',color:gold,fontWeight:700,flexShrink:0,marginTop:2}}>✓</span>
                  <div>
                    <span style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:600,fontSize:'.95rem',color:navy,display:'block',letterSpacing:'.03em'}}>{b.t}</span>
                    <span style={{fontFamily:"'Crimson Pro',serif",fontSize:'.85rem',color:'#8A8890'}}>{b.d}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase==='quiz' && cq && (
          <div style={{width:'100%',maxWidth:560,position:'relative',zIndex:2,padding:'0 1rem'}}>
            <div style={{marginBottom:'2rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.5rem'}}>
                <span style={{fontFamily:"'Crimson Pro',serif",fontSize:'clamp(.75rem,2vw,.85rem)',color:'#B0AEB5'}}>Pergunta {qIdx+1} de {QS.length}</span>
                <span style={{fontFamily:"'Crimson Pro',serif",fontSize:'clamp(.75rem,2vw,.85rem)',color:gold,fontWeight:600}}>{pct}%</span>
              </div>
              <div style={{height:3,background:'rgba(27,37,65,.08)',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${navy},${gold})`,transition:'width .5s ease',borderRadius:2}}/>
              </div>
            </div>
            <div key={qIdx} style={{animation:dir==='fwd'?'slideR .3s ease-out':'slideL .3s ease-out'}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(1.2rem,3.5vw,1.55rem)',fontWeight:400,marginBottom:'.4rem',lineHeight:1.3,color:navy}}>{cq.q}</h3>
              <p style={{fontFamily:"'Crimson Pro',serif",fontSize:'.9rem',color:'#B0AEB5',marginBottom:'1.5rem',fontStyle:'italic'}}>{cq.sub}</p>
              <div style={{display:'flex',flexDirection:'column',gap:'.55rem'}}>
                {cq.opts.map((o,i) => (
                  <div 
                    key={i} 
                    className="opt quiz-option" 
                    onClick={()=>answer(cq.id,o.v)} 
                    style={{animation:`fadeUp .25s ease-out ${i*.05}s both`}}
                    id={`btn-quiz-question${qIdx + 1}-option${i + 1}`}
                    data-section={`question-${qIdx + 1}`}
                    data-action="answer"
                    data-element="option-button"
                    data-quiz-step={qIdx + 1}
                    data-quiz-question={cq.id}
                    data-quiz-option={o.v}
                    data-quiz-option-index={i + 1}
                    data-quiz-option-label={o.l}
                  >
                    <span style={{fontSize:'.95rem',minWidth:'1.4rem',textAlign:'center',color:gold,fontFamily:"'Cormorant Garamond',serif",fontWeight:600}}>{o.i}</span>
                    <span style={{fontFamily:"'Crimson Pro',serif",fontSize:'1rem',color:navy}}>{o.l}</span>
                  </div>
                ))}
              </div>
            </div>
            {qIdx>0 && (
              <button 
                onClick={back} 
                style={{marginTop:'1.5rem',background:'transparent',border:'1px solid rgba(27,37,65,.1)',color:'#B0AEB5',padding:'.5rem 1rem',borderRadius:2,cursor:'pointer',fontSize:'.85rem',fontFamily:"'Crimson Pro',serif"}}
                id={`btn-quiz-question${qIdx + 1}-back`}
                data-section={`question-${qIdx + 1}`}
                data-action="back"
                data-element="navigation-button"
                data-quiz-step={qIdx + 1}
              >
                ← Voltar
              </button>
            )}
          </div>
        )}

        {phase==='socialProof' && (
          <div style={{textAlign:'center',maxWidth:640,position:'relative',zIndex:2}}>
            <div style={{width:50,height:50,borderRadius:'50%',border:`3px solid rgba(27,37,65,.08)`,borderTopColor:gold,margin:'0 auto 1.8rem',animation:'spin 1s linear infinite'}}/>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'.78rem',letterSpacing:'.15em',textTransform:'uppercase',color:gold,marginBottom:'1.5rem'}}>
              Analisando seu perfil
            </p>
            <div key={proofIdx} style={{
              borderRadius:3,overflow:'hidden',maxWidth:280,margin:'0 auto',
              animation: proofVisible ? 'proofIn .5s ease-out' : 'proofOut .3s ease-out forwards',
            }}>
              <img
                src={proofImages[proofIdx]}
                alt={`Cliente ${tenantName} ${proofIdx + 1}`}
                style={{width:'100%',height:'auto',display:'block',borderRadius:3}}
              />
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:'.35rem',marginTop:'.8rem'}}>
              {proofImages.map((_,i) => <span key={i} style={{width:5,height:5,borderRadius:'50%',background:i===proofIdx?gold:'rgba(27,37,65,.1)',transition:'all .3s'}}/>)}
            </div>
          </div>
        )}

        {phase==='analyzing' && (
          <div style={{textAlign:'center',maxWidth:480,position:'relative',zIndex:2}}>
            <div style={{width:50,height:50,borderRadius:'50%',border:`3px solid rgba(27,37,65,.08)`,borderTopColor:gold,margin:'0 auto 2rem',animation:'spin 1s linear infinite'}}/>
            <div key={analyzeStep} style={{animation:'scaleIn .5s ease-out',padding:'1.2rem 2rem',background:'rgba(27,37,65,.03)',border:'1px solid rgba(27,37,65,.06)',borderRadius:3}}>
              <span style={{color:gold,fontFamily:"'Cormorant Garamond',serif",fontWeight:600,marginRight:'.5rem'}}>◈</span>
              <span style={{fontFamily:"'Crimson Pro',serif",fontSize:'1.05rem',color:navy}}>
                {analyzeTexts[analyzeStep]}
              </span>
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:'.35rem',marginTop:'1.2rem'}}>
              {analyzeTexts.map((_,i) => <span key={i} style={{width:5,height:5,borderRadius:'50%',background:i<=analyzeStep?gold:'rgba(27,37,65,.1)',transition:'all .3s'}}/>)}
            </div>
          </div>
        )}

        {phase==='ready' && (
          <div style={{width:'100%',maxWidth:500,position:'relative',zIndex:2,animation:'scaleIn .4s ease-out',padding:'0 1rem'}}>
            <div style={{textAlign:'center',marginBottom:'1.8rem'}}>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(.7rem,2vw,.8rem)',letterSpacing:'.15em',textTransform:'uppercase',color:gold,marginBottom:'.8rem'}}>✓ Análise concluída</p>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(1.3rem,3.5vw,1.9rem)',fontWeight:400,marginBottom:'.6rem',color:navy}}>Seu resultado está pronto</h2>
            </div>
            <div style={{background:'rgba(27,37,65,.025)',border:'1px solid rgba(27,37,65,.06)',borderRadius:3,padding:'1.8rem'}}>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'.75rem',letterSpacing:'.12em',textTransform:'uppercase',color:gold,marginBottom:'1rem'}}>Para onde enviamos?</p>
              <label style={{fontFamily:"'Crimson Pro',serif",fontSize:'.8rem',color:'#8A8890',display:'block',marginBottom:'.25rem'}}>Nome completo</label>
              <input 
                className="inp quiz-input" 
                type="text" 
                placeholder="Seu nome" 
                value={form.name} 
                onChange={e=>{setForm({...form,name:e.target.value});setErr('')}}
                id="input-quiz-form-name"
                data-section="form"
                data-action="input"
                data-element="text-field"
                data-quiz-field="name"
              />
              <label style={{fontFamily:"'Crimson Pro',serif",fontSize:'.8rem',color:'#8A8890',display:'block',marginBottom:'.25rem'}}>Telefone / WhatsApp</label>
              <input 
                className="inp quiz-input" 
                type="tel" 
                placeholder="(41) 99999-9999" 
                value={form.phone} 
                onChange={e=>{setForm({...form,phone:e.target.value});setErr('')}}
                id="input-quiz-form-phone"
                data-section="form"
                data-action="input"
                data-element="tel-field"
                data-quiz-field="phone"
              />
              <label style={{fontFamily:"'Crimson Pro',serif",fontSize:'.8rem',color:'#8A8890',display:'block',marginBottom:'.25rem'}}>E-mail</label>
              <input 
                className="inp quiz-input" 
                type="email" 
                placeholder="seu@email.com" 
                value={form.email} 
                onChange={e=>{setForm({...form,email:e.target.value});setErr('')}}
                id="input-quiz-form-email"
                data-section="form"
                data-action="input"
                data-element="email-field"
                data-quiz-field="email"
              />
              {err && <p style={{fontFamily:"'Crimson Pro',serif",fontSize:'.85rem',color:'#C41E3A',marginBottom:'.4rem',animation:'fadeIn .2s ease'}}>{err}</p>}
              <button 
                className="cta quiz-cta" 
                onClick={submit} 
                style={{width:'100%',justifyContent:'center',marginTop:'.5rem'}}
                id="btn-quiz-form-submit"
                data-section="form"
                data-action="submit"
                data-element="submit-button"
                data-quiz-step="captura"
              >
                Enviar →
              </button>
              <p style={{fontFamily:"'Crimson Pro',serif",fontSize:'.72rem',color:'#B0AEB5',marginTop:'.7rem',textAlign:'center',fontStyle:'italic'}}>Seus dados estão seguros. Não enviamos spam.</p>
            </div>
          </div>
        )}

        {phase==='done' && (
          <div style={{textAlign:'center',maxWidth:480,position:'relative',zIndex:2,animation:'scaleIn .4s ease-out',padding:'0 1rem'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:`linear-gradient(135deg,${navy},#2A3A5C)`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.5rem',animation:'checkPop .5s ease-out',border:`2px solid ${gold}`}}>
              <span style={{fontSize:'2rem',color:gold}}>✓</span>
            </div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(1.3rem,3.5vw,1.9rem)',fontWeight:400,marginBottom:'.6rem',color:navy}}>Tudo certo, {form.name.split(' ')[0]}.</h2>
            <p style={{fontFamily:"'Crimson Pro',serif",fontSize:'clamp(.95rem,2.5vw,1.05rem)',color:'#5C5A65',lineHeight:1.7,marginBottom:'.8rem'}}>Sua análise personalizada e o guia completo estão sendo enviados para:</p>
            <div style={{display:'inline-block',background:'rgba(27,37,65,.04)',border:'1px solid rgba(27,37,65,.08)',borderRadius:2,padding:'.7rem 1.5rem',marginBottom:'2rem',maxWidth:'100%',wordBreak:'break-word'}}>
              <span style={{fontFamily:"'Crimson Pro',serif",fontSize:'clamp(.85rem,2vw,.95rem)',color:navy,fontWeight:600}}>✉ {form.email}</span>
            </div>
            <p style={{fontFamily:"'Crimson Pro',serif",fontSize:'clamp(.8rem,2vw,.9rem)',color:'#B0AEB5',lineHeight:1.7,marginBottom:'2rem',fontStyle:'italic'}}>Confira sua caixa de entrada. Se preferir, fale agora com um especialista.</p>
            <div className="mobcol" style={{display:'flex',gap:'.8rem',justifyContent:'center',flexWrap:'wrap'}}>
              <a href={`https://wa.me/${waPhone}?text=Olá! Fiz o teste de elegibilidade. Meu nome é ${encodeURIComponent(form.name)}. Gostaria de uma consulta.`} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none'}}>
                <button
                  style={{
                    fontFamily:"'Cormorant Garamond',serif",fontSize:'1.05rem',letterSpacing:'.12em',textTransform:'uppercase',
                    padding:'1.1rem 2.8rem',background:navyHex,color:creamHex,border:`1px solid ${goldHex}`,
                    cursor:'pointer',transition:'all .3s ease',borderRadius:2,display:'inline-flex',alignItems:'center',gap:'.6rem'
                  }}
                  onMouseOver={e=>{e.currentTarget.style.background=goldHex;e.currentTarget.style.color=navyHex}}
                  onMouseOut={e=>{e.currentTarget.style.background=navyHex;e.currentTarget.style.color=creamHex}}
                  id="btn-quiz-resultado-whatsapp"
                  data-section="resultado"
                  data-action="whatsapp"
                  data-element="cta-button"
                  data-quiz-step="concluido"
                >
                  Falar com Especialista →
                </button>
              </a>
              <button 
                onClick={reset} 
                style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'.95rem',letterSpacing:'.12em',textTransform:'uppercase',padding:'.9rem 2rem',background:'transparent',color:'#8A8890',border:'1px solid rgba(27,37,65,.12)',cursor:'pointer',transition:'all .3s ease',borderRadius:2}}
                id="btn-quiz-resultado-restart"
                data-section="resultado"
                data-action="restart"
                data-element="secondary-button"
              >
                Refazer Teste
              </button>
            </div>
            <div style={{marginTop:30,paddingTop:20,borderTop:'1px solid rgba(27,37,65,0.1)',display:'flex',gap:15,justifyContent:'center',flexWrap:'wrap',fontSize:'clamp(11px,2vw,13px)'}}>
              {contactWebsite && <a href={`https://${contactWebsite}`} target="_blank" rel="noopener noreferrer" style={{fontFamily:"'Crimson Pro',serif",fontSize:'inherit',color:'#8A8890',textDecoration:'none'}}>{contactWebsite}</a>}
              {contactInstagram && <a href={`https://www.instagram.com/${contactInstagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" style={{fontFamily:"'Crimson Pro',serif",fontSize:'inherit',color:'#8A8890',textDecoration:'none'}}>{contactInstagram}</a>}
              {contactEmail && <span style={{fontFamily:"'Crimson Pro',serif",fontSize:'inherit',color:'#8A8890'}}>{contactEmail}</span>}
            </div>
          </div>
        )}

        <div style={{position:'absolute',bottom:0,left:0,right:0,height:5,background:`linear-gradient(90deg,#1B3A6B 40%,${gold} 40%,${gold} 60%,#C41E3A 60%)`}}/>
      </section>

      {/* Footer */}
      {(() => {
        const footerDark = tenant?.copy?.footerDark !== false;
        const footerBg = footerDark ? '#0F1A2E' : creamHex;
        const footerBorder = footerDark ? 'rgba(255,255,255,0.1)' : `rgba(0,0,0,0.1)`;
        const footerTitle = footerDark ? 'white' : navyHex;
        const footerText = footerDark ? 'rgba(255,255,255,0.6)' : `rgba(0,0,0,0.55)`;
        const footerLink = footerDark ? 'rgba(255,255,255,0.7)' : `rgba(0,0,0,0.65)`;
        const footerMuted = footerDark ? 'rgba(255,255,255,0.4)' : `rgba(0,0,0,0.4)`;
        const footerHover = goldHex;
        return (
      <footer style={{position:'relative',zIndex:50,backgroundColor:footerBg,borderTop:`1px solid ${footerBorder}`,padding:'3rem 1.5rem'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          {/* Footer Grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))',gap:'2rem',marginBottom:'2rem'}}>
            {/* Coluna 1: Empresa */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center'}}>
              {footerLogoUrl && <div style={{marginBottom:'1rem'}}>
                <img
                  src={footerLogoUrl}
                  alt={tenantName}
                  style={{height:80,width:'auto'}}
                />
              </div>}
              <p style={{fontSize:'.875rem',color:footerText,lineHeight:1.6}}>
                {tenant?.copy?.footerTagline ?? 'Consultoria especializada em processos migratórios e estratégias de acúmulo de milhas aéreas.'}
              </p>
            </div>

            {/* Coluna 2: Contato */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center'}}>
              <h5 style={{color:footerTitle,fontWeight:'bold',marginBottom:'1rem',fontSize:'.875rem',letterSpacing:'.1em',textTransform:'uppercase'}}>Contato</h5>
              <div style={{display:'flex',flexDirection:'column',gap:'.625rem'}}>
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.875rem',color:footerLink,textDecoration:'none',transition:'color .25s'}}
                    onMouseOver={e=>e.currentTarget.style.color=footerHover}
                    onMouseOut={e=>e.currentTarget.style.color=footerLink}
                  >
                    <span>✉️</span>
                    <span>{contactEmail}</span>
                  </a>
                )}
                {contactInstagram && (
                  <a
                    href={`https://instagram.com/${contactInstagram.replace('@','')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.875rem',color:footerLink,textDecoration:'none',transition:'color .25s'}}
                    onMouseOver={e=>e.currentTarget.style.color=footerHover}
                    onMouseOut={e=>e.currentTarget.style.color=footerLink}
                  >
                    <span>📷</span>
                    <span>{contactInstagram}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Coluna 3: Outros Serviços */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center'}}>
              <h5 style={{color:footerTitle,fontWeight:'bold',marginBottom:'1rem',fontSize:'.875rem',letterSpacing:'.1em',textTransform:'uppercase'}}>Outros Serviços</h5>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:'.5rem',fontSize:'.875rem',color:footerText}}>
                {(tenant?.copy?.footerServices?.length
                  ? tenant.copy.footerServices
                  : ['Visto de Turismo (Canadá, Austrália, EUA)', 'Visto de Trabalho para EUA', 'Cidadania (Italiana, Portuguesa, Alemã)', 'Genealogia']
                ).map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          {/* Barra inferior */}
          <div style={{paddingTop:'1.5rem',borderTop:`1px solid ${footerBorder}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'.75rem',fontSize:'.75rem',color:footerMuted,textAlign:'center'}}>
            <div>
              <div>{tenant?.copy?.footerCopyright ?? `© 2026 ${tenantName} • Todos os direitos reservados`}</div>
              {tenant?.copy?.footerAddress && <div style={{marginTop:'.25rem'}}>{tenant.copy.footerAddress}</div>}
            </div>
          </div>
        </div>
      </footer>
        );
      })()}
    </div>
  );
};

export default Quiz;
