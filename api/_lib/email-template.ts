import type { Theme, Assets, Contact, Copy } from './tenant-schema.js';

export interface VisaScore {
  met: number;
  total: number;
  pct: number;
}

export interface EmailData {
  name: string;
  email: string;
  primary_visa: string;
  visas: {
    eb2niw: VisaScore;
    eb1a: VisaScore;
    l1a: VisaScore;
    o1a: VisaScore;
  };
  any_eligible: boolean;
  l1a_risk: boolean;
  // tenant branding
  tenant: {
    name: string;
    theme: Theme;
    assets: Assets;
    contact: Contact;
    copy: Copy;
  };
}

const visaNames: Record<string, string> = {
  eb2niw: 'EB-2 NIW — Green Card por Interesse Nacional',
  eb1a:   'EB-1A — Green Card por Habilidade Extraordinária',
  l1a:    'L-1A — Transferência de Executivo',
  o1a:    'O-1A — Visto de Talento Excepcional',
};

export function generateEmailHTML(data: EmailData): string {
  const { tenant } = data;
  const t = tenant.theme;
  const a = tenant.assets;
  const c = tenant.contact;
  const copy = tenant.copy;
  const emailGold = t.goldEmail || t.gold;

  const firstName = data.name.split(' ')[0];
  const primaryVisaName = visaNames[data.primary_visa] || data.primary_visa;

  const showNotEligible = !data.any_eligible;
  const showL1aRisk     = data.l1a_risk && !showNotEligible;
  const showPrimaryVisa = !showNotEligible;

  const whatsappUrl = `https://wa.me/${c.whatsapp}?text=Ol%C3%A1%2C%20fiz%20o%20teste%20de%20elegibilidade%20e%20gostaria%20de%20saber%20mais%20sobre%20o%20meu%20resultado.`;
  const approvalEbNiw = copy.approvalRateEbNiwEb1a;
  const approvalL1a   = copy.approvalRateL1aO1a;

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Seu Resultado — ${tenant.name}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
    body { margin:0; padding:0; width:100%; }
    @media only screen and (max-width:600px) {
      .email-container { width:100%!important; max-width:100%!important; }
      .mobile-pad { padding-left:20px!important; padding-right:20px!important; }
      .bar-label { font-size:13px!important; }
      .stat-col { display:block!important; width:100%!important; text-align:center!important; padding:10px 0!important; border-left:none!important; border-right:none!important; border-bottom:1px solid rgba(27,37,65,0.06)!important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${t.cream}; font-family:Georgia,'Times New Roman',serif;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${t.cream};">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px; background-color:${t.creamAlt}; border-radius:2px; overflow:hidden; box-shadow:0 2px 20px rgba(27,37,65,0.08);" class="email-container">

          <!-- FLAG BAR -->
          <tr><td style="height:5px; background:linear-gradient(90deg,${t.flagBlue} 40%,${emailGold} 40%,${emailGold} 60%,${t.flagRed} 60%); font-size:0; line-height:0;">&nbsp;</td></tr>

          <!-- HEADER -->
          <tr>
            <td style="padding:35px 40px 25px; text-align:center; border-bottom:1px solid rgba(27,37,65,0.06);" class="mobile-pad">
              ${a.logoUrl
                ? `<img src="${a.logoUrl}" alt="${tenant.name}" style="height:40px; margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;">`
                : `<p style="margin:0; font-family:Georgia,serif; font-size:22px; font-weight:bold; letter-spacing:3px; color:${t.navy};">${tenant.name.toUpperCase()}</p>
                   <p style="margin:4px 0 0; font-family:Georgia,serif; font-size:10px; letter-spacing:5px; color:${emailGold}; text-transform:uppercase;">Consultoria Migratória</p>`
              }
            </td>
          </tr>

          <!-- GREETING -->
          <tr><td style="padding:40px 40px 10px;" class="mobile-pad">
            <p style="margin:0; font-family:Georgia,serif; font-size:14px; color:${emailGold}; letter-spacing:3px; text-transform:uppercase;">Resultado da sua análise</p>
          </td></tr>
          <tr><td style="padding:5px 40px 10px;" class="mobile-pad">
            <h1 style="margin:0; font-family:Georgia,serif; font-size:28px; font-weight:normal; color:${t.navy}; line-height:1.25;">Olá, ${firstName}.</h1>
          </td></tr>
          <tr><td style="padding:0 40px 30px;" class="mobile-pad">
            <p style="margin:0; font-family:Georgia,serif; font-size:15px; color:#5C5A65; line-height:1.8;">
              Analisamos suas respostas e mapeamos o seu perfil nos <strong style="color:${t.navy};">critérios reais do USCIS</strong> (U.S. Citizenship and Immigration Services) para cada categoria de visto. Abaixo, o percentual de critérios que você já atende — com total transparência.
            </p>
          </td></tr>

          <!-- DIVIDER -->
          <tr><td style="padding:0 40px;" class="mobile-pad"><div style="height:1px; background:linear-gradient(90deg,${t.flagBlue},${emailGold},${t.flagRed});"></div></td></tr>

          <!-- LAUDO -->
          <tr><td style="padding:30px 40px 10px;" class="mobile-pad">
            <p style="margin:0 0 5px; font-family:Georgia,serif; font-size:12px; color:${emailGold}; letter-spacing:3px; text-transform:uppercase;">Seu Laudo de Elegibilidade</p>
            <h2 style="margin:0; font-family:Georgia,serif; font-size:22px; font-weight:normal; color:${t.navy};">Critérios atendidos por categoria</h2>
          </td></tr>

          <!-- EB-2 NIW BAR -->
          <tr><td style="padding:20px 40px 0;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr><td style="font-family:Georgia,serif; font-size:15px; font-weight:bold; color:${t.navy}; padding-bottom:4px;" class="bar-label">EB-2 NIW <span style="float:right; color:${emailGold}; font-weight:bold;">${data.visas.eb2niw.met} de ${data.visas.eb2niw.total} — ${data.visas.eb2niw.pct}%</span></td></tr>
              <tr><td><div style="width:100%; height:12px; background-color:rgba(27,37,65,0.08); border-radius:2px;"><div style="width:${data.visas.eb2niw.pct}%; height:12px; background:linear-gradient(90deg,${t.navy},${t.navyAlt}); border-radius:2px; min-width:4px;"></div></div></td></tr>
              <tr><td style="font-family:Georgia,serif; font-size:12px; color:#8A8890; padding-top:3px; font-style:italic;">Green Card direto • Sem patrocinador • Base legal: INA §203(b)(2) + Matter of Dhanasar</td></tr>
            </table>
          </td></tr>

          <!-- EB-1A BAR -->
          <tr><td style="padding:18px 40px 0;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr><td style="font-family:Georgia,serif; font-size:15px; font-weight:bold; color:${t.navy}; padding-bottom:4px;" class="bar-label">EB-1A <span style="float:right; color:${emailGold}; font-weight:bold;">${data.visas.eb1a.met} de ${data.visas.eb1a.total} — ${data.visas.eb1a.pct}%</span></td></tr>
              <tr><td><div style="width:100%; height:12px; background-color:rgba(27,37,65,0.08); border-radius:2px;"><div style="width:${data.visas.eb1a.pct}%; height:12px; background:linear-gradient(90deg,#6B21A8,#9333EA); border-radius:2px; min-width:4px;"></div></div></td></tr>
              <tr><td style="font-family:Georgia,serif; font-size:12px; color:#8A8890; padding-top:3px; font-style:italic;">Green Card direto • Sem patrocinador • Base legal: INA §203(b)(1)(A) + Kazarian v. USCIS</td></tr>
            </table>
          </td></tr>

          <!-- L-1A BAR -->
          <tr><td style="padding:18px 40px 0;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr><td style="font-family:Georgia,serif; font-size:15px; font-weight:bold; color:${t.navy}; padding-bottom:4px;" class="bar-label">L-1A <span style="float:right; color:${emailGold}; font-weight:bold;">${data.visas.l1a.met} de ${data.visas.l1a.total} — ${data.visas.l1a.pct}%</span></td></tr>
              <tr><td><div style="width:100%; height:12px; background-color:rgba(27,37,65,0.08); border-radius:2px;"><div style="width:${data.visas.l1a.pct}%; height:12px; background:linear-gradient(90deg,#047857,#059669); border-radius:2px; min-width:4px;"></div></div></td></tr>
              <tr><td style="font-family:Georgia,serif; font-size:12px; color:#8A8890; padding-top:3px; font-style:italic;">Visto de trabalho → Green Card via EB-1C • Base legal: INA §101(a)(15)(L)</td></tr>
            </table>
          </td></tr>

          <!-- O-1A BAR -->
          <tr><td style="padding:18px 40px 30px;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr><td style="font-family:Georgia,serif; font-size:15px; font-weight:bold; color:${t.navy}; padding-bottom:4px;" class="bar-label">O-1A <span style="float:right; color:${emailGold}; font-weight:bold;">${data.visas.o1a.met} de ${data.visas.o1a.total} — ${data.visas.o1a.pct}%</span></td></tr>
              <tr><td><div style="width:100%; height:12px; background-color:rgba(27,37,65,0.08); border-radius:2px;"><div style="width:${data.visas.o1a.pct}%; height:12px; background:linear-gradient(90deg,#B91C1C,#DC2626); border-radius:2px; min-width:4px;"></div></div></td></tr>
              <tr><td style="font-family:Georgia,serif; font-size:12px; color:#8A8890; padding-top:3px; font-style:italic;">Visto de talento → Green Card via EB-1A • Base legal: INA §101(a)(15)(O)</td></tr>
            </table>
          </td></tr>

          ${showPrimaryVisa ? `
          <tr><td style="padding:0 40px 20px;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${t.navy}; border-radius:3px;">
              <tr><td style="padding:25px 30px; text-align:center;">
                <p style="margin:0 0 5px; font-family:Georgia,serif; font-size:11px; color:${emailGold}; letter-spacing:3px; text-transform:uppercase;">Melhor caminho para o seu perfil</p>
                <h2 style="margin:0 0 8px; font-family:Georgia,serif; font-size:26px; font-weight:normal; color:${t.creamAlt};">${primaryVisaName}</h2>
                <p style="margin:0; font-family:Georgia,serif; font-size:14px; color:rgba(250,250,248,0.5); line-height:1.6;">
                  Esta é a categoria em que você atende mais critérios com base nas suas respostas. A análise final depende da documentação completa do seu caso.
                </p>
              </td></tr>
            </table>
          </td></tr>
          ` : ''}

          ${showNotEligible ? `
          <tr><td style="padding:0 40px 25px;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(196,30,58,0.04); border:1px solid rgba(196,30,58,0.12); border-radius:3px;">
              <tr><td style="padding:22px 25px;">
                <p style="margin:0 0 5px; font-family:Georgia,serif; font-size:11px; color:${t.flagRed}; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">⚠ Avaliação Honesta</p>
                <p style="margin:0 0 10px; font-family:Georgia,serif; font-size:16px; font-weight:bold; color:${t.navy};">Seu perfil precisa ser fortalecido</p>
                <p style="margin:0; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;">
                  ${firstName}, queremos ser transparentes: com base nas suas respostas, você atende um número reduzido de critérios nas categorias disponíveis. Isso não significa que seu sonho é impossível — mas significa que <strong style="color:${t.navy};">iniciar um processo agora seria prematuro</strong> e poderia resultar em negativa do USCIS, perda de investimento e tempo.
                </p>
                <p style="margin:12px 0 0; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;">
                  Nossa recomendação é focar em fortalecer seu perfil: acumular experiência na área de formação, buscar publicações, participar de projetos de impacto ou obter certificações relevantes. Quando seu perfil estiver mais robusto, teremos prazer em reavaliar o seu caso.
                </p>
              </td></tr>
            </table>
          </td></tr>
          ` : ''}

          ${showL1aRisk ? `
          <tr><td style="padding:0 40px 25px;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(184,134,11,0.06); border:1px solid rgba(184,134,11,0.2); border-radius:3px;">
              <tr><td style="padding:22px 25px;">
                <p style="margin:0 0 5px; font-family:Georgia,serif; font-size:11px; color:${emailGold}; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">⚠ Ponto de atenção</p>
                <p style="margin:0 0 10px; font-family:Georgia,serif; font-size:16px; font-weight:bold; color:${t.navy};">L-1A requer estrutura organizacional</p>
                <p style="margin:0; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;">
                  A categoria L-1A exige que a empresa no Brasil possua uma <strong style="color:${t.navy};">estrutura com pelo menos 10 colaboradores</strong> para sustentar o cargo executivo ou gerencial perante o USCIS. Empresas com equipes menores apresentam risco significativo de negativa. Recomendamos discutir alternativas na sua consulta.
                </p>
              </td></tr>
            </table>
          </td></tr>
          ` : ''}

          <!-- DIVIDER -->
          <tr><td style="padding:0 40px;" class="mobile-pad"><div style="height:1px; background:linear-gradient(90deg,rgba(27,37,65,0.06),rgba(27,37,65,0.15),rgba(27,37,65,0.06));"></div></td></tr>

          <!-- CATEGORIAS -->
          <tr><td style="padding:30px 40px 10px;" class="mobile-pad">
            <p style="margin:0 0 5px; font-family:Georgia,serif; font-size:12px; color:${emailGold}; letter-spacing:3px; text-transform:uppercase;">Entenda as categorias</p>
            <h2 style="margin:0; font-family:Georgia,serif; font-size:22px; font-weight:normal; color:${t.navy};">Os 4 caminhos legais para os EUA</h2>
          </td></tr>

          <!-- EB-2 NIW -->
          <tr><td style="padding:20px 40px 0;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(27,37,65,0.03); border-left:3px solid ${t.navy}; border-radius:0 3px 3px 0;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 2px; font-family:Georgia,serif; font-size:11px; color:${emailGold}; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">🇺🇸 EB-2 NIW</p>
                <p style="margin:0 0 10px; font-family:Georgia,serif; font-size:17px; font-weight:bold; color:${t.navy};">Green Card por Interesse Nacional</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:12px;">
                  <tr>
                    <td width="50%" style="padding:8px 10px; background:rgba(27,37,65,0.04); border-radius:2px; vertical-align:top;">
                      <p style="margin:0 0 2px; font-family:Georgia,serif; font-size:10px; color:${emailGold}; letter-spacing:1px; text-transform:uppercase;">Tipo</p>
                      <p style="margin:0; font-family:Georgia,serif; font-size:13px; color:${t.navy}; font-weight:bold;">Green Card Direto</p>
                    </td>
                    <td width="5"></td>
                    <td width="50%" style="padding:8px 10px; background:rgba(27,37,65,0.04); border-radius:2px; vertical-align:top;">
                      <p style="margin:0 0 2px; font-family:Georgia,serif; font-size:10px; color:${emailGold}; letter-spacing:1px; text-transform:uppercase;">Taxa USCIS 2025</p>
                      <p style="margin:0; font-family:Georgia,serif; font-size:13px; color:${t.navy}; font-weight:bold;">~54–67% geral</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;"><strong style="color:${t.navy};">O que é:</strong> Residência permanente (Green Card) para profissionais com grau avançado que demonstram que seu trabalho beneficia os Estados Unidos.</p>
                <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;"><strong style="color:${t.navy};">Vantagens:</strong> Você faz a petição sozinho (self-petition), sem depender de empregador americano. Inclui cônjuge e filhos. Aplica do Brasil.</p>
                <p style="margin:0; font-family:Georgia,serif; font-size:12px; color:#8A8890; font-style:italic;">Base legal: INA §203(b)(2) • Matter of Dhanasar, 26 I&N Dec. 884 (AAO 2016) • Prazo: 12-18 meses</p>
              </td></tr>
            </table>
          </td></tr>

          <!-- EB-1A -->
          <tr><td style="padding:14px 40px 0;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(27,37,65,0.03); border-left:3px solid #9333EA; border-radius:0 3px 3px 0;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 2px; font-family:Georgia,serif; font-size:11px; color:#9333EA; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">⭐ EB-1A</p>
                <p style="margin:0 0 10px; font-family:Georgia,serif; font-size:17px; font-weight:bold; color:${t.navy};">Green Card por Habilidade Extraordinária</p>
                <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;"><strong style="color:${t.navy};">O que é:</strong> A categoria mais prestigiada do sistema americano. Residência permanente para profissionais que comprovem ao menos 3 de 10 critérios de excelência.</p>
                <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;"><strong style="color:${t.navy};">Vantagens:</strong> Green Card direto, sem patrocinador (self-petition). Premium Processing disponível (45 dias). Inclui cônjuge e filhos.</p>
                <p style="margin:0; font-family:Georgia,serif; font-size:12px; color:#8A8890; font-style:italic;">Base legal: INA §203(b)(1)(A) • Kazarian v. USCIS (2010) • Prazo: 12-18 meses (45 dias com Premium)</p>
              </td></tr>
            </table>
          </td></tr>

          <!-- L-1A -->
          <tr><td style="padding:14px 40px 0;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(27,37,65,0.03); border-left:3px solid #059669; border-radius:0 3px 3px 0;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 2px; font-family:Georgia,serif; font-size:11px; color:#059669; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">🏢 L-1A</p>
                <p style="margin:0 0 10px; font-family:Georgia,serif; font-size:17px; font-weight:bold; color:${t.navy};">Transferência de Executivo</p>
                <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;"><strong style="color:${t.navy};">O que é:</strong> Visto de trabalho para empresários e executivos que possuem empresa no Brasil e desejam abrir ou expandir operação nos EUA.</p>
                <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;"><strong style="color:${t.navy};">Requisito importante:</strong> A empresa no Brasil precisa ter <strong style="color:${t.flagRed};">no mínimo 10 funcionários</strong> para sustentar o cargo executivo/gerencial.</p>
                <p style="margin:0; font-family:Georgia,serif; font-size:12px; color:#8A8890; font-style:italic;">Base legal: INA §101(a)(15)(L) • Green Card: EB-1C, INA §203(b)(1)(C) • Prazo: 4-8 meses</p>
              </td></tr>
            </table>
          </td></tr>

          <!-- O-1A -->
          <tr><td style="padding:14px 40px 30px;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(27,37,65,0.03); border-left:3px solid #DC2626; border-radius:0 3px 3px 0;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 2px; font-family:Georgia,serif; font-size:11px; color:#DC2626; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">🏆 O-1A</p>
                <p style="margin:0 0 10px; font-family:Georgia,serif; font-size:17px; font-weight:bold; color:${t.navy};">Visto de Talento Excepcional</p>
                <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;"><strong style="color:${t.navy};">O que é:</strong> Visto de trabalho para profissionais com realizações extraordinárias. Exige 3 de 8 critérios. Renovável indefinidamente e serve como trampolim para o Green Card via EB-1A.</p>
                <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:14px; color:#5C5A65; line-height:1.7;"><strong style="color:${t.navy};">Vantagens:</strong> A mais alta taxa de aprovação entre todas as categorias (~94%). Processamento em 3-6 meses. Inclui cônjuge e filhos.</p>
                <p style="margin:0; font-family:Georgia,serif; font-size:12px; color:#8A8890; font-style:italic;">Base legal: INA §101(a)(15)(O) • Green Card: via EB-1A petition • Prazo: 3-6 meses</p>
              </td></tr>
            </table>
          </td></tr>

          <!-- DIVIDER -->
          <tr><td style="padding:0 40px;" class="mobile-pad"><div style="height:1px; background:linear-gradient(90deg,rgba(27,37,65,0.06),rgba(27,37,65,0.15),rgba(27,37,65,0.06));"></div></td></tr>

          <!-- SOBRE O PARCEIRO -->
          <tr><td style="padding:30px 40px 10px;" class="mobile-pad">
            <p style="margin:0 0 5px; font-family:Georgia,serif; font-size:12px; color:${emailGold}; letter-spacing:3px; text-transform:uppercase;">Quem vai cuidar do seu caso</p>
            <h2 style="margin:0; font-family:Georgia,serif; font-size:22px; font-weight:normal; color:${t.navy};">${tenant.name}</h2>
          </td></tr>
          <tr><td style="padding:10px 40px 15px;" class="mobile-pad">
            <p style="margin:0; font-family:Georgia,serif; font-size:15px; color:#5C5A65; line-height:1.8;">
              Sabemos que as taxas de aprovação do USCIS assustam — e é por isso que existimos. Somos uma consultoria especializada exclusivamente em processos migratórios de alto padrão. Preparamos cada petição com o rigor que o USCIS exige.
            </p>
          </td></tr>

          <!-- STATS -->
          <tr><td style="padding:5px 40px 5px;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${t.navy}; border-radius:3px;">
              <tr>
                <td style="padding:22px 15px; text-align:center; vertical-align:top;" width="50%" class="stat-col">
                  <p style="margin:0 0 3px; font-family:Georgia,serif; font-size:28px; font-weight:bold; color:${emailGold};">${approvalEbNiw}</p>
                  <p style="margin:0; font-family:Georgia,serif; font-size:11px; color:rgba(250,250,248,0.5); letter-spacing:1px; text-transform:uppercase;">Aprovação EB-2 NIW &amp; EB-1A</p>
                  <p style="margin:4px 0 0; font-family:Georgia,serif; font-size:10px; color:rgba(250,250,248,0.3); font-style:italic;">vs. ~54-67% média geral USCIS</p>
                </td>
                <td style="padding:22px 15px; text-align:center; vertical-align:top; border-left:1px solid rgba(250,250,248,0.08);" width="50%" class="stat-col">
                  <p style="margin:0 0 3px; font-family:Georgia,serif; font-size:28px; font-weight:bold; color:${emailGold};">${approvalL1a}</p>
                  <p style="margin:0; font-family:Georgia,serif; font-size:11px; color:rgba(250,250,248,0.5); letter-spacing:1px; text-transform:uppercase;">Aprovação L-1A &amp; O-1A</p>
                  <p style="margin:4px 0 0; font-family:Georgia,serif; font-size:10px; color:rgba(250,250,248,0.3); font-style:italic;">vs. ~80-94% média geral USCIS</p>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- DIVIDER -->
          <tr><td style="padding:20px 40px 0;" class="mobile-pad"><div style="height:1px; background:linear-gradient(90deg,rgba(27,37,65,0.06),rgba(27,37,65,0.15),rgba(27,37,65,0.06));"></div></td></tr>

          <!-- EBOOK -->
          ${a.ebookUrl ? `
          <tr><td style="padding:30px 40px;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${t.navy}; border-radius:3px;">
              <tr><td style="padding:30px; text-align:center;">
                <p style="margin:0 0 4px; font-family:Georgia,serif; font-size:30px;">📘</p>
                <p style="margin:0 0 5px; font-family:Georgia,serif; font-size:11px; color:${emailGold}; letter-spacing:3px; text-transform:uppercase;">E-book gratuito</p>
                <h3 style="margin:0 0 10px; font-family:Georgia,serif; font-size:20px; font-weight:normal; color:${t.creamAlt}; line-height:1.3;">Guia Completo: Os 4 Caminhos<br>para Morar nos EUA</h3>
                <p style="margin:0 0 20px; font-family:Georgia,serif; font-size:14px; color:rgba(250,250,248,0.5); line-height:1.6;">Requisitos detalhados, prazos, custos estimados, documentação necessária e como fortalecer seu perfil para cada categoria.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td style="background:${emailGold}; border-radius:2px;">
                      <a href="${a.ebookUrl}" target="_blank" style="display:inline-block; padding:14px 35px; font-family:Georgia,serif; font-size:14px; color:${t.navy}; text-decoration:none; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">Baixar E-book →</a>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:0 40px;" class="mobile-pad"><div style="height:1px; background:linear-gradient(90deg,rgba(27,37,65,0.06),rgba(27,37,65,0.15),rgba(27,37,65,0.06));"></div></td></tr>
          ` : ''}

          <!-- CTA -->
          <tr><td style="padding:30px 40px 10px;" class="mobile-pad">
            <p style="margin:0 0 5px; font-family:Georgia,serif; font-size:12px; color:${emailGold}; letter-spacing:3px; text-transform:uppercase;">Próximo passo</p>
            <h2 style="margin:0; font-family:Georgia,serif; font-size:22px; font-weight:normal; color:${t.navy};">Quer saber exatamente como avançar?</h2>
          </td></tr>
          <tr><td style="padding:10px 40px 25px;" class="mobile-pad">
            <p style="margin:0; font-family:Georgia,serif; font-size:15px; color:#5C5A65; line-height:1.8;">
              Este laudo é uma pré-análise baseada nas suas respostas. Para uma avaliação completa com análise documental, fale diretamente com nosso time pelo WhatsApp — é o jeito mais rápido de começar.
            </p>
          </td></tr>
          <tr><td style="padding:0 40px 35px; text-align:center;" class="mobile-pad">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td style="background:${t.navy}; border:1px solid ${emailGold}; border-radius:2px;">
                  <a href="${whatsappUrl}" target="_blank" style="display:inline-block; padding:15px 40px; font-family:Georgia,serif; font-size:14px; color:${t.creamAlt}; text-decoration:none; letter-spacing:2px; text-transform:uppercase;">Falar pelo WhatsApp →</a>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- FLAG BAR BOTTOM -->
          <tr><td style="height:5px; background:linear-gradient(90deg,${t.flagBlue} 40%,${emailGold} 40%,${emailGold} 60%,${t.flagRed} 60%); font-size:0; line-height:0;">&nbsp;</td></tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:25px 40px; text-align:center; background:rgba(27,37,65,0.03);" class="mobile-pad">
              <p style="margin:0 0 5px; font-family:Georgia,serif; font-size:16px; font-weight:bold; letter-spacing:2px; color:${t.navy};">${tenant.name.toUpperCase()}</p>
              <p style="margin:0 0 12px; font-family:Georgia,serif; font-size:10px; letter-spacing:3px; color:${emailGold}; text-transform:uppercase;">Consultoria Migratória</p>
              ${c.phone ? `<p style="margin:0 0 5px; font-family:Georgia,serif; font-size:12px; color:#8A8890;">${c.phone}</p>` : ''}
              <p style="margin:8px 0 0; font-family:Georgia,serif; font-size:11px; color:#B0AEB5; line-height:1.6;">
                Você recebeu este e-mail porque completou nosso teste de elegibilidade.<br>
                Este laudo não constitui aconselhamento jurídico. Os percentuais são estimativas baseadas em respostas auto-declaradas.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
