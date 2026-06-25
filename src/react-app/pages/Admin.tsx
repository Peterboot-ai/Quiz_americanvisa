import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/react-app/components/ui/card';
import { Button } from '@/react-app/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/react-app/components/ui/table';
import { CriteriaModal } from '@/react-app/components/CriteriaModal';
import { LeadDetailModal } from '@/react-app/components/LeadDetailModal';
import { OnboardingChecklist } from '@/react-app/components/OnboardingChecklist';
import { useTenant } from '@/react-app/contexts/TenantContext';
import * as XLSX from 'xlsx';
import { supabase } from '@/react-app/lib/supabase';

interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  eb2niw_met: number;
  eb2niw_total: number;
  eb1a_met: number;
  eb1a_total: number;
  l1a_met: number;
  l1a_total: number;
  o1a_met: number;
  o1a_total: number;
  l1a_risk: boolean;
  company_size: string;
  notes: string;
  status: string;
  assigned_to: string;
  purpose: string;
  priority: string;
  created_at: string;
}

const Admin = () => {
  const { tenant } = useTenant();
  const tenantSlug = new URLSearchParams(window.location.search).get('tenant') ?? undefined;
  const [session, setSession] = useState<{ access_token: string; user: { email: string } } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<{
    visaType: string;
    criteria: Array<{ name: string; met: boolean }>;
    met: number;
    total: number;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [eligibilityFilter, setEligibilityFilter] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [onboarding, setOnboarding] = useState<{
    isComplete: boolean;
    completedCount: number;
    totalCount: number;
    steps: Array<{ key: string; label: string; description: string; done: boolean }>;
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const statusOptions = [
    { value: 'novo', label: 'Novo', color: 'bg-blue-100 text-blue-800' },
    { value: 'transferido', label: 'Transferido', color: 'bg-purple-100 text-purple-800' },
  ];

  // Supabase Auth: monitor session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as typeof session & { user: { email: string } });
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as typeof session & { user: { email: string } });
    });
    return () => subscription.unsubscribe();
  }, []);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
  });

  const fetchLeads = async (token?: string) => {
    const t = token ?? session?.access_token ?? '';
    if (!t) return;
    try {
      const leadsUrl = tenantSlug ? `/api/admin/leads?tenant=${tenantSlug}` : '/api/admin/leads';
      const response = await fetch(leadsUrl, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      });
      const data = await response.json();
      if (data.success) setLeads(data.leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      const token = session.access_token;
      fetchLeads(token);
      // Check onboarding status
      const onboardingUrl = tenantSlug ? `/api/admin/onboarding?tenant=${tenantSlug}` : '/api/admin/onboarding';
      fetch(onboardingUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setOnboarding(data);
            if (!data.isComplete) setShowOnboarding(true);
          }
        })
        .catch(() => {/* non-blocking */});
    } else {
      setLoading(false);
    }
  }, [session]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/admin/leads/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      fetchLeads();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updateAssigned = async (id: number, assigned_to: string) => {
    try {
      await fetch(`/api/admin/leads/${id}/assigned`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ assigned_to }),
      });
      fetchLeads();
    } catch (error) {
      console.error('Error updating assigned:', error);
    }
  };

  const deleteLead = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o lead de ${name}?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (response.ok) fetchLeads();
      else alert('Erro ao excluir lead. Tente novamente.');
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Erro ao excluir lead. Tente novamente.');
    }
  };

  const getStatusDisplay = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ?? { label: 'Novo', color: 'bg-blue-100 text-blue-800' };
  };

  const showCriteriaDetails = async (leadId: number, visaType: 'eb2niw' | 'eb1a' | 'l1a' | 'o1a') => {
    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, { headers: authHeaders() });
      const data = await response.json();
      if (data.success && data.lead.visa_criteria) {
        const criteria = data.lead.visa_criteria[visaType];
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        const metCount   = visaType === 'eb2niw' ? lead.eb2niw_met : visaType === 'eb1a' ? lead.eb1a_met : visaType === 'l1a' ? lead.l1a_met : lead.o1a_met;
        const totalCount = visaType === 'eb2niw' ? lead.eb2niw_total : visaType === 'eb1a' ? lead.eb1a_total : visaType === 'l1a' ? lead.l1a_total : lead.o1a_total;
        setSelectedCriteria({ visaType, criteria, met: metCount, total: totalCount });
        setModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching criteria details:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch (error) {
      console.error('Error during login:', error);
      alert('Erro ao tentar fazer login. Por favor, tente novamente.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isPotentialClient = (lead: Lead): boolean => {
    if (lead.eb2niw_met >= 4 || lead.eb1a_met >= 4) return true;
    if (lead.o1a_met >= 4) return true;
    if (!lead.l1a_risk && lead.l1a_met >= 3) return true;
    return false;
  };

  const getEligibility = (lead: Lead): 'alta' | 'media' | 'baixa' => {
    if (isPotentialClient(lead)) return 'alta';
    if (lead.eb2niw_met >= 3 || lead.eb1a_met >= 3 || lead.o1a_met >= 3 || lead.l1a_met >= 2) return 'media';
    return 'baixa';
  };

  const getPurposeLabel = (purpose: string | null | undefined): string => {
    const purposes: Record<string, string> = {
      serious: 'Interesse real', opportunities: 'Avaliando opções',
      curious: 'Apenas curioso', exploring: 'Entender chances',
    };
    return purpose && purposes[purpose] ? purposes[purpose] : '-';
  };

  const getPriorityLabel = (priority: string | null | undefined): string => {
    const priorities: Record<string, string> = {
      urgent: '🔥 Urgente', '6to8months': '⏰ 6-8 meses',
      researching: '📚 Pesquisando', just_knowing: '💡 Conhecendo',
    };
    return priority && priorities[priority] ? priorities[priority] : '-';
  };

  const getPriorityColor = (priority: string | null | undefined): string => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800', '6to8months': 'bg-orange-100 text-orange-800',
      researching: 'bg-blue-100 text-blue-800', just_knowing: 'bg-gray-100 text-gray-600',
    };
    return priority && colors[priority] ? colors[priority] : 'bg-gray-100 text-gray-600';
  };

  const filteredLeads = leads.filter(lead => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!lead.name.toLowerCase().includes(term) && !lead.email.toLowerCase().includes(term) && !lead.phone.includes(term)) return false;
    }
    if (statusFilter !== 'todos' && lead.status !== statusFilter) return false;
    if (eligibilityFilter !== 'todas' && getEligibility(lead) !== eligibilityFilter) return false;
    return true;
  });

  const stats = {
    total: leads.length,
    alta: leads.filter(l => getEligibility(l) === 'alta').length,
    media: leads.filter(l => getEligibility(l) === 'media').length,
    baixa: leads.filter(l => getEligibility(l) === 'baixa').length,
    novos: leads.filter(l => l.status === 'novo').length,
    transferidos: leads.filter(l => l.status === 'transferido').length,
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Nome', 'Telefone', 'Email', 'EB-2 NIW', 'EB-1A', 'L-1A', 'O-1A', 'Viabilidade', 'Propósito', 'Prioridade', 'Status', 'Responsável'];
    const eligLabels: Record<string, string> = { alta: 'Elegível', media: 'Médio', baixa: 'Não Elegível' };
    const rows = filteredLeads.map(lead => [
      new Date(lead.created_at).toLocaleDateString('pt-BR'), lead.name, lead.phone, lead.email,
      `${lead.eb2niw_met}/${lead.eb2niw_total}`, `${lead.eb1a_met}/${lead.eb1a_total}`,
      `${lead.l1a_met}/${lead.l1a_total}`, `${lead.o1a_met}/${lead.o1a_total}`,
      eligLabels[getEligibility(lead)] || 'Não Elegível', getPurposeLabel(lead.purpose),
      getPriorityLabel(lead.priority).replace(/[🔥⏰📚💡]/g, '').trim(),
      lead.status || 'novo', lead.assigned_to || '-',
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    const headers = ['Data', 'Nome', 'Telefone', 'Email', 'EB-2 NIW', 'EB-1A', 'L-1A', 'O-1A', 'Viabilidade', 'Propósito', 'Prioridade', 'Status', 'Responsável'];
    const eligLabels: Record<string, string> = { alta: 'Elegível', media: 'Médio', baixa: 'Não Elegível' };
    const rows = filteredLeads.map(lead => [
      new Date(lead.created_at).toLocaleDateString('pt-BR'), lead.name, lead.phone, lead.email,
      `${lead.eb2niw_met}/${lead.eb2niw_total}`, `${lead.eb1a_met}/${lead.eb1a_total}`,
      `${lead.l1a_met}/${lead.l1a_total}`, `${lead.o1a_met}/${lead.o1a_total}`,
      eligLabels[getEligibility(lead)] || 'Não Elegível', getPurposeLabel(lead.purpose),
      getPriorityLabel(lead.priority).replace(/[🔥⏰📚💡]/g, '').trim(),
      lead.status || 'novo', lead.assigned_to || '-',
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    XLSX.writeFile(workbook, `leads-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const sendTestReport = async () => {
    try {
      if (!confirm('Enviar e-mail de teste do relatório diário para toda a equipe?')) return;
      const response = await fetch('/api/admin/leads/test-daily-report', {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await response.json();
      if (data.success) alert(`✅ E-mail de teste enviado!\n\nLeads de ontem: ${data.leadCount}\nDestinatários: ${data.recipients.length}`);
      else alert(`❌ Erro ao enviar e-mail: ${data.error}`);
    } catch (error) {
      console.error('Error sending test report:', error);
      alert('❌ Erro ao enviar e-mail de teste');
    }
  };

  // Assignees from tenant config (fallback to empty list)
  const assignees = tenant?.team?.assignees ?? [];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a2847] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    const logoUrl = tenant?.assets?.logoLight || tenant?.assets?.logoUrl || '';
    const navy = tenant?.theme?.navy || '#1a2847';
    return (
      <div className="min-h-screen flex">
        <div className="w-1/2 flex items-center justify-center p-12" style={{ backgroundColor: navy }}>
          <div className="max-w-md">
            {logoUrl
              ? <img src={logoUrl} alt={tenant?.name ?? 'Logo'} className="w-full max-w-[400px]" />
              : <p className="text-white text-3xl font-bold tracking-widest">{tenant?.name?.toUpperCase() ?? ''}</p>
            }
          </div>
        </div>
        <div className="w-1/2 bg-white flex items-center justify-center p-12">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold mb-3" style={{ color: navy }}>
              Bem-vindo ao {tenant?.name ?? 'Admin'}
            </h1>
            <p className="text-gray-600 mb-8">Faça login com sua conta Google corporativa</p>
            <Button
              onClick={handleLogin}
              className="w-full py-6 text-base font-medium flex items-center justify-center gap-3 text-white"
              style={{ backgroundColor: navy }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Entrar com Google
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userEmail = session.user.email?.toLowerCase().trim() ?? '';

  return (
    <div className="min-h-screen bg-[#F0EDE8] p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#334155]">{tenant?.name ?? ''} Admin</h1>
            <p className="text-sm text-[#64748B]">Portal de Leads</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center text-white font-semibold">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-[#334155]">{userEmail.split('@')[0]}</div>
                <div className="text-xs text-[#64748B]">{userEmail}</div>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="bg-[#F59E0B] hover:bg-[#D97706] text-white border-0">
              Sair
            </Button>
          </div>
        </div>

        {/* Onboarding checklist */}
        {showOnboarding && onboarding && !onboarding.isComplete && (
          <div className="mb-6">
            <OnboardingChecklist
              completedCount={onboarding.completedCount}
              totalCount={onboarding.totalCount}
              steps={onboarding.steps}
              tenantName={tenant?.name ?? 'Admin'}
              onDismiss={() => setShowOnboarding(false)}
            />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <Card className="bg-white"><CardContent className="p-4"><div className="text-3xl font-bold text-[#334155] mb-1">{stats.total}</div><div className="text-sm text-[#64748B]">Total Leads</div></CardContent></Card>
          <Card className="bg-white"><CardContent className="p-4"><div className="text-3xl font-bold text-[#10B981] mb-1 flex items-center gap-2">🎉 {stats.alta}</div><div className="text-sm text-[#64748B]">Alta</div></CardContent></Card>
          <Card className="bg-white"><CardContent className="p-4"><div className="text-3xl font-bold text-[#F59E0B] mb-1 flex items-center gap-2">⚠️ {stats.media}</div><div className="text-sm text-[#64748B]">Média</div></CardContent></Card>
          <Card className="bg-white"><CardContent className="p-4"><div className="text-3xl font-bold text-[#EF4444] mb-1 flex items-center gap-2">🚦 {stats.baixa}</div><div className="text-sm text-[#64748B]">Baixa</div></CardContent></Card>
          <Card className="bg-white"><CardContent className="p-4"><div className="text-3xl font-bold text-[#3B82F6] mb-1 flex items-center gap-2">🆕 {stats.novos}</div><div className="text-sm text-[#64748B]">Novos</div></CardContent></Card>
          <Card className="bg-white"><CardContent className="p-4"><div className="text-3xl font-bold text-[#10B981] mb-1 flex items-center gap-2">✅ {stats.transferidos}</div><div className="text-sm text-[#64748B]">Transferidos</div></CardContent></Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex gap-3 flex-1">
            <div className="flex-1 max-w-sm">
              <label className="block text-sm font-medium text-[#334155] mb-1">Buscar</label>
              <input type="text" placeholder="Nome, email ou telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-[#CBD5E1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]">
                <option value="todos">Todos</option>
                <option value="novo">Novo</option>
                <option value="transferido">Transferido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Viabilidade</label>
              <select value={eligibilityFilter} onChange={(e) => setEligibilityFilter(e.target.value)} className="px-4 py-2 border border-[#CBD5E1] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]">
                <option value="todas">Todas</option>
                <option value="alta">Elegível</option>
                <option value="media">Médio</option>
                <option value="baixa">Não Elegível</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={sendTestReport} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white flex items-center gap-2">📧 Testar Relatório</Button>
            <Button onClick={exportToCSV} className="bg-[#10B981] hover:bg-[#059669] text-white flex items-center gap-2">📊 Exportar CSV</Button>
            <Button onClick={exportToExcel} className="bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-2">📗 Exportar Excel</Button>
            <Button onClick={fetchLeads} className="bg-[#334155] hover:bg-[#1E293B] text-white flex items-center gap-2">🔄 Atualizar</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#5C5A65]">Carregando leads...</div>
        ) : filteredLeads.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-[#5C5A65]">
            {searchTerm || statusFilter !== 'todos' || eligibilityFilter !== 'todas'
              ? 'Nenhum lead encontrado com os filtros aplicados'
              : 'Nenhum lead encontrado'}
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[85px] text-xs">Data</TableHead>
                      <TableHead className="w-[120px]">Nome</TableHead>
                      <TableHead className="w-[110px] text-xs">Telefone</TableHead>
                      <TableHead className="w-[140px] text-xs">Email</TableHead>
                      <TableHead className="text-center w-[70px] text-xs">EB-2</TableHead>
                      <TableHead className="text-center w-[70px] text-xs">EB-1A</TableHead>
                      <TableHead className="text-center w-[70px] text-xs">L-1A</TableHead>
                      <TableHead className="text-center w-[70px] text-xs">O-1A</TableHead>
                      <TableHead className="text-center w-[90px] text-xs">Viabilidade</TableHead>
                      <TableHead className="w-[120px] text-xs">Propósito</TableHead>
                      <TableHead className="w-[120px] text-xs">Prioridade</TableHead>
                      <TableHead className="w-[140px] text-xs">Status</TableHead>
                      <TableHead className="w-[110px] text-xs">Responsável</TableHead>
                      <TableHead className="w-[80px] text-xs">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="text-xs py-2">{new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</TableCell>
                        <TableCell className="font-medium text-sm py-2 max-w-[120px]" title={lead.name}>
                          <button onClick={() => { setSelectedLeadId(lead.id); setDetailModalOpen(true); }} className="text-left truncate block w-full hover:text-[#D4A847] hover:underline cursor-pointer transition-colors">
                            {lead.name}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs py-2">{lead.phone}</TableCell>
                        <TableCell className="text-xs py-2 max-w-[140px] truncate" title={lead.email}>{lead.email}</TableCell>
                        <TableCell className="text-center py-2">
                          <button onClick={() => showCriteriaDetails(lead.id, 'eb2niw')} className="text-xs font-semibold hover:text-[#1B2541] hover:underline cursor-pointer transition-colors">{lead.eb2niw_met}/{lead.eb2niw_total}</button>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <button onClick={() => showCriteriaDetails(lead.id, 'eb1a')} className="text-xs font-semibold hover:text-[#1B2541] hover:underline cursor-pointer transition-colors">{lead.eb1a_met}/{lead.eb1a_total}</button>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <button onClick={() => showCriteriaDetails(lead.id, 'l1a')} className="text-xs font-semibold hover:text-[#1B2541] hover:underline cursor-pointer transition-colors">{lead.l1a_met}/{lead.l1a_total}</button>
                          {lead.l1a_risk && <div className="text-[10px] text-yellow-600">⚠️</div>}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <button onClick={() => showCriteriaDetails(lead.id, 'o1a')} className="text-xs font-semibold hover:text-[#1B2541] hover:underline cursor-pointer transition-colors">{lead.o1a_met}/{lead.o1a_total}</button>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          {(() => {
                            const elig = getEligibility(lead);
                            if (elig === 'alta') return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800">✅ Elegível</span>;
                            if (elig === 'media') return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800">⚠️ Médio</span>;
                            return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">Não Elegível</span>;
                          })()}
                        </TableCell>
                        <TableCell className="py-2"><span className="text-[10px] max-w-[120px] truncate block" title={getPurposeLabel(lead.purpose)}>{getPurposeLabel(lead.purpose)}</span></TableCell>
                        <TableCell className="py-2"><span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getPriorityColor(lead.priority)}`}>{getPriorityLabel(lead.priority)}</span></TableCell>
                        <TableCell className="py-2">
                          <select value={lead.status || 'novo'} onChange={(e) => updateStatus(lead.id, e.target.value)} className={`text-[10px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer w-full ${getStatusDisplay(lead.status || 'novo').color}`}>
                            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </TableCell>
                        <TableCell className="py-2">
                          <select value={lead.assigned_to || ''} onChange={(e) => updateAssigned(lead.id, e.target.value)} className="text-[10px] px-2 py-1 rounded border border-gray-300 cursor-pointer bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#D4A847] w-full">
                            <option value="">-</option>
                            {assignees.map((name) => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </TableCell>
                        <TableCell className="py-2">
                          <Button variant="destructive" size="sm" onClick={() => deleteLead(lead.id, lead.name)} className="text-[10px] px-2 py-1 h-auto">Excluir</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedCriteria && (
          <CriteriaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} visaType={selectedCriteria.visaType} criteria={selectedCriteria.criteria} met={selectedCriteria.met} total={selectedCriteria.total} />
        )}

        <LeadDetailModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} leadId={selectedLeadId} accessToken={session?.access_token ?? ''} />
      </div>
    </div>
  );
};

export default Admin;
