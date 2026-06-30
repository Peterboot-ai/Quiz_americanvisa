import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/react-app/components/ui/card';
import { Button } from '@/react-app/components/ui/button';
import { supabase } from '@/react-app/lib/supabase';

interface Tenant {
  id: number;
  slug: string;
  name: string;
  legal_name: string;
  active: boolean;
  domains: string[];
  allowed_email_domain: string;
  sender_email: string;
  sender_name: string;
  report_recipients: string[];
  theme: Record<string, string>;
  assets: Record<string, unknown>;
  contact: Record<string, unknown>;
  copy: Record<string, unknown>;
  tracking: Record<string, string>;
  team: { assignees: string[] };
  created_at: string;
}

type Tab = 'info' | 'branding' | 'contact' | 'copy' | 'team' | 'assets' | 'users';

interface TenantUser {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

type FormState = Record<string, unknown>;
type SetForm = React.Dispatch<React.SetStateAction<FormState>>;

const F = ({ label, fkey, type = 'text', placeholder = '', form, setForm }: { label: string; fkey: string; type?: string; placeholder?: string; form: FormState; setForm: SetForm }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    {type === 'checkbox' ? (
      <input type="checkbox" checked={!!form[fkey]} onChange={e => setForm(f => ({ ...f, [fkey]: e.target.checked }))} className="w-4 h-4" />
    ) : type === 'textarea' ? (
      <textarea value={String(form[fkey] ?? '')} onChange={e => setForm(f => ({ ...f, [fkey]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-20 resize-none"/>
    ) : (
      <input type={type} value={String(form[fkey] ?? '')} onChange={e => setForm(f => ({ ...f, [fkey]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
    )}
  </div>
);

const Color = ({ label, fkey, form, setForm }: { label: string; fkey: string; form: FormState; setForm: SetForm }) => (
  <div className="flex items-center gap-2 mb-2">
    <input type="color" value={String(form[fkey] ?? '#000000')} onChange={e => setForm(f => ({ ...f, [fkey]: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border"/>
    <input type="text" value={String(form[fkey] ?? '')} onChange={e => setForm(f => ({ ...f, [fkey]: e.target.value }))} className="w-28 px-2 py-1 border rounded text-xs font-mono"/>
    <span className="text-xs text-gray-500">{label}</span>
  </div>
);

const SuperAdmin = () => {
  const [session, setSession] = useState<{ access_token: string; user: { email: string } } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [tab, setTab] = useState<Tab>('info');
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, string>>({});
  const [generatingPalette, setGeneratingPalette] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTenant, setNewTenant] = useState({ slug: '', name: '', allowed_email_domain: '', sender_email: '', sender_name: '' });
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as typeof session & { user: { email: string } });
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s as typeof s & { user: { email: string } });
    });
    return () => subscription.unsubscribe();
  }, []);

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  });

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    // Verify super_admin
    fetch('/api/admin/tenants', { headers: headers() }).then(async (r) => {
      if (r.ok) {
        setIsSuperAdmin(true);
        const data = await r.json();
        setTenants(data.tenants ?? []);
      } else {
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });
  }, [session]);

  const loadTenantUsers = async (tenantId: number) => {
    const r = await fetch(`/api/admin/tenants/${tenantId}/users`, { headers: headers() });
    const data = await r.json();
    if (data.success) setTenantUsers(data.users ?? []);
  };

  const inviteUser = async () => {
    if (!selected || !inviteEmail.trim()) return;
    setInviting(true);
    setMsg('');
    try {
      const r = await fetch(`/api/admin/tenants/${selected.id}/users`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ email: inviteEmail.trim(), role: 'partner_admin' }),
      });
      const data = await r.json();
      if (data.success) {
        setMsg('✅ Convite enviado');
        setInviteEmail('');
        await loadTenantUsers(selected.id);
      } else {
        setMsg(`❌ ${data.error}`);
      }
    } finally {
      setInviting(false);
    }
  };

  const removeUser = async (userId: string) => {
    if (!selected || !confirm('Remover acesso deste usuário?')) return;
    const r = await fetch(`/api/admin/tenants/${selected.id}/users`, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await r.json();
    if (data.success) {
      setMsg('✅ Usuário removido');
      await loadTenantUsers(selected.id);
    } else {
      setMsg(`❌ ${data.error}`);
    }
  };

  const selectTenant = (t: Tenant) => {
    setSelected(t);
    setTab('info');
    setForm({
      name: t.name,
      legal_name: t.legal_name ?? '',
      active: t.active,
      domains: (t.domains ?? []).join(', '),
      allowed_email_domain: t.allowed_email_domain ?? '',
      sender_email: t.sender_email ?? '',
      sender_name: t.sender_name ?? '',
      report_recipients: (t.report_recipients ?? []).join(', '),
      brevo_api_key: '',
      // theme
      navy: t.theme?.navy ?? '#1B2541',
      navyAlt: t.theme?.navyAlt ?? '#1a2847',
      gold: t.theme?.gold ?? '#B8860B',
      goldAlt: t.theme?.goldAlt ?? '#D4A847',
      cream: t.theme?.cream ?? '#F0EDE8',
      creamAlt: t.theme?.creamAlt ?? '#FAFAF8',
      flagBlue: t.theme?.flagBlue ?? '#1B3A6B',
      flagRed: t.theme?.flagRed ?? '#C41E3A',
      goldEmail: t.theme?.goldEmail ?? '',
      // contact
      whatsapp: (t.contact as Record<string, string>)?.whatsapp ?? '',
      phone: (t.contact as Record<string, string>)?.phone ?? '',
      email: (t.contact as Record<string, string>)?.email ?? '',
      instagram: (t.contact as Record<string, string>)?.instagram ?? '',
      website: (t.contact as Record<string, string>)?.website ?? '',
      // copy
      approvalRateEbNiwEb1a: (t.copy as Record<string, string>)?.approvalRateEbNiwEb1a ?? '82%',
      approvalRateL1aO1a: (t.copy as Record<string, string>)?.approvalRateL1aO1a ?? '96%',
      footerTagline: (t.copy as Record<string, string>)?.footerTagline ?? '',
      footerCopyright: (t.copy as Record<string, string>)?.footerCopyright ?? '',
      footerAddress: (t.copy as Record<string, string>)?.footerAddress ?? '',
      footerServices: ((t.copy as Record<string, unknown>)?.footerServices as string[] ?? []).join('\n'),
      footerDark: (t.copy as Record<string, unknown>)?.footerDark !== false,
      // tracking
      gtmId: t.tracking?.gtmId ?? '',
      // team
      assignees: (t.team?.assignees ?? []).join(', '),
    });
    setMsg('');
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setMsg('');
    try {
      const body: Record<string, unknown> = {};

      if (tab === 'info') {
        body.name = form.name;
        body.legal_name = form.legal_name;
        body.active = form.active;
        body.domains = String(form.domains).split(',').map(s => s.trim()).filter(Boolean);
        body.allowed_email_domain = form.allowed_email_domain;
        body.sender_email = form.sender_email;
        body.sender_name = form.sender_name;
        body.report_recipients = String(form.report_recipients).split(',').map(s => s.trim()).filter(Boolean);
        if (form.brevo_api_key) body.brevo_api_key = form.brevo_api_key;
      } else if (tab === 'branding') {
        body.theme = {
          navy: form.navy, navyAlt: form.navyAlt,
          gold: form.gold, goldAlt: form.goldAlt,
          cream: form.cream, creamAlt: form.creamAlt,
          flagBlue: form.flagBlue, flagRed: form.flagRed,
          goldEmail: form.goldEmail,
        };
      } else if (tab === 'contact') {
        body.contact = {
          whatsapp: form.whatsapp, phone: form.phone,
          email: form.email, instagram: form.instagram, website: form.website,
        };
      } else if (tab === 'copy') {
        body.copy = {
          approvalRateEbNiwEb1a: form.approvalRateEbNiwEb1a,
          approvalRateL1aO1a: form.approvalRateL1aO1a,
          footerTagline: form.footerTagline,
          footerCopyright: form.footerCopyright,
          footerAddress: form.footerAddress,
          footerServices: form.footerServices.split('\n').map((s: string) => s.trim()).filter(Boolean),
          footerDark: form.footerDark,
        };
        body.tracking = { gtmId: form.gtmId };
      } else if (tab === 'team') {
        body.team = {
          assignees: String(form.assignees).split(',').map(s => s.trim()).filter(Boolean),
        };
      }

      const r = await fetch(`/api/admin/tenants/${selected.id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (data.success) {
        setMsg('✅ Salvo com sucesso');
        const r2 = await fetch('/api/admin/tenants', { headers: headers() });
        const d2 = await r2.json();
        setTenants(d2.tenants ?? []);
        const updated = d2.tenants?.find((t: Tenant) => t.id === selected.id);
        if (updated) setSelected(updated);
      } else {
        setMsg(`❌ Erro: ${data.error}`);
      }
    } catch (e) {
      setMsg('❌ Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const uploadAsset = async (assetKey: string) => {
    const file = fileRefs.current[assetKey]?.files?.[0];
    if (!file || !selected) return;
    setUploading(true);
    setMsg('');
    try {
      const bucket = 'tenant-assets';
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
      const ts = Date.now();
      const path = `${selected.slug}/${assetKey}_${ts}.${ext}`;

      // Remove arquivo antigo do storage
      const oldUrl = assetKey !== 'proofImage' ? selected.assets?.[assetKey] as string | undefined : undefined;
      if (oldUrl) {
        const oldPathMatch = oldUrl.match(/tenant-assets\/(.+?)(\?.*)?$/);
        if (oldPathMatch) await supabase.storage.from(bucket).remove([oldPathMatch[1]]);
      }

      // Upload direto do browser para o Supabase Storage (sem limite do Vercel)
      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadErr) { setMsg(`❌ ${uploadErr.message}`); return; }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

      // Atualiza assets no banco via API
      let newAssets: Record<string, unknown>;
      if (assetKey === 'proofImage') {
        const existing = Array.isArray(selected.assets?.proofImages) ? selected.assets.proofImages as string[] : [];
        newAssets = { ...selected.assets, proofImages: [...existing, publicUrl] };
      } else {
        newAssets = { ...selected.assets, [assetKey]: publicUrl };
      }

      const r = await fetch(`/api/admin/tenants/${selected.id}`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: newAssets }),
      });
      const data = await r.json();
      if (data.success) {
        setMsg(`✅ Upload feito!`);
        const r2 = await fetch('/api/admin/tenants', { headers: headers() });
        const d2 = await r2.json();
        setTenants(d2.tenants ?? []);
        const updated = d2.tenants?.find((t: Tenant) => t.id === selected.id);
        if (updated) { setSelected(updated); selectTenant(updated); }
      } else {
        setMsg(`❌ ${data.error}`);
      }
    } finally {
      setUploading(false);
      if (fileRefs.current[assetKey]) fileRefs.current[assetKey]!.value = '';
      setSelectedFiles(prev => { const n = { ...prev }; delete n[assetKey]; return n; });
    }
  };

  const deleteAsset = async (assetKey: string, url?: string) => {
    if (!selected) return;
    setDeletingAsset(assetKey);
    setMsg('');
    try {
      const params = new URLSearchParams({ assetKey });
      if (url) params.set('url', url);
      const r = await fetch(`/api/admin/tenants/${selected.id}/upload?${params}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      const data = await r.json();
      if (data.success) {
        setMsg('✅ Imagem removida');
        const r2 = await fetch('/api/admin/tenants', { headers: headers() });
        const d2 = await r2.json();
        setTenants(d2.tenants ?? []);
        const updated = d2.tenants?.find((t: Tenant) => t.id === selected.id);
        if (updated) { setSelected(updated); selectTenant(updated); }
      } else {
        setMsg(`❌ ${data.error}`);
      }
    } finally {
      setDeletingAsset(null);
    }
  };

  const generatePalette = async () => {
    const file = fileRefs.current['logoUrl']?.files?.[0];
    if (!file && !selected?.assets?.logoUrl) {
      setMsg('❌ Faça o upload da Logo principal primeiro, ou selecione um arquivo de logo.');
      return;
    }
    setGeneratingPalette(true);
    setMsg('');
    try {
      let imageBase64: string;
      let mimeType: string;

      if (file) {
        mimeType = file.type;
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        // Fetch existing logo and convert to base64
        const resp = await fetch(selected!.assets!.logoUrl as string);
        const blob = await resp.blob();
        mimeType = blob.type || 'image/png';
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const r = await fetch(`/api/admin/tenants/${selected!.id}/suggest-palette`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await r.json();
      if (data.success && data.palette) {
        setForm(f => ({ ...f, ...data.palette }));
        setMsg('✅ Paleta gerada! Revise as cores e clique em Salvar.');
      } else {
        setMsg(`❌ ${data.error ?? 'Erro ao gerar paleta'}`);
      }
    } catch (e) {
      setMsg('❌ Erro ao gerar paleta');
    } finally {
      setGeneratingPalette(false);
    }
  };

  const createTenant = async () => {
    if (!newTenant.slug || !newTenant.name) return;
    const r = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(newTenant),
    });
    const data = await r.json();
    if (data.success) {
      setMsg('✅ Tenant criado');
      setShowNewForm(false);
      setNewTenant({ slug: '', name: '', allowed_email_domain: '', sender_email: '', sender_name: '' });
      const r2 = await fetch('/api/admin/tenants', { headers: headers() });
      const d2 = await r2.json();
      setTenants(d2.tenants ?? []);
    } else {
      setMsg(`❌ ${data.error}`);
    }
  };

  const handleLogin = async () => {
    sessionStorage.setItem('auth_redirect', '/super-admin');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-80"><CardContent className="p-8 text-center">
          <h1 className="text-xl font-bold mb-4">Super Admin</h1>
          <Button onClick={handleLogin} className="w-full">Entrar com Google</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-80"><CardContent className="p-8 text-center">
          <p className="text-red-600 font-semibold">Acesso negado.</p>
          <p className="text-sm text-gray-500 mt-2">Sua conta não tem permissão de super_admin.</p>
          <Button className="mt-4 w-full" variant="outline" onClick={() => supabase.auth.signOut()}>Sair</Button>
        </CardContent></Card>
      </div>
    );
  }

  const switchTab = (t: Tab) => {
    setTab(t);
    setMsg('');
    if (t === 'users' && selected) loadTenantUsers(selected.id);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Informações' },
    { key: 'branding', label: 'Cores' },
    { key: 'contact', label: 'Contato' },
    { key: 'copy', label: 'Textos / GTM' },
    { key: 'team', label: 'Equipe' },
    { key: 'assets', label: 'Assets' },
    { key: 'users', label: 'Usuários' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-gray-800">Super Admin</h1>
          <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tenants</span>
            <button onClick={() => setShowNewForm(true)} className="text-blue-600 text-xs hover:underline">+ Novo</button>
          </div>
          {tenants.map(t => (
            <button key={t.id} onClick={() => selectTenant(t)}
              className={`w-full text-left px-3 py-2 rounded text-sm mb-1 transition-colors ${selected?.id === t.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-gray-400">{t.slug} {!t.active && '· inativo'}</div>
            </button>
          ))}
        </div>
        <div className="p-2 border-t">
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => supabase.auth.signOut()}>Sair</Button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-6 overflow-y-auto">
        {showNewForm && (
          <Card className="mb-6 max-w-lg">
            <CardContent className="p-6">
              <h2 className="font-bold mb-4 text-gray-800">Novo Parceiro</h2>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug — ID único na URL (ex: hub-vistos)</label>
                <input value={newTenant.slug} onChange={e => setNewTenant(n => ({ ...n, slug: e.target.value }))} placeholder="hub-vistos" className="w-full px-3 py-2 border rounded text-sm"/>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome da empresa <span className="text-red-400">*</span></label>
                <input value={newTenant.name} onChange={e => setNewTenant(n => ({ ...n, name: e.target.value }))} placeholder="Hub Vistos" className="w-full px-3 py-2 border rounded text-sm"/>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail do parceiro (para login no admin)</label>
                <input value={newTenant.allowed_email_domain} onChange={e => setNewTenant(n => ({ ...n, allowed_email_domain: e.target.value }))} placeholder="cris@hubvistos.com.br" className="w-full px-3 py-2 border rounded text-sm"/>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail que aparece no envio para o cliente</label>
                <input value={newTenant.sender_email} onChange={e => setNewTenant(n => ({ ...n, sender_email: e.target.value }))} placeholder="contato@hubvistos.com.br" className="w-full px-3 py-2 border rounded text-sm"/>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome que aparece no envio para o cliente</label>
                <input value={newTenant.sender_name} onChange={e => setNewTenant(n => ({ ...n, sender_name: e.target.value }))} placeholder="Hub Vistos" className="w-full px-3 py-2 border rounded text-sm"/>
              </div>
              <div className="flex gap-2">
                <Button onClick={createTenant} size="sm">Criar</Button>
                <Button variant="outline" size="sm" onClick={() => setShowNewForm(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!selected ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Selecione um tenant na barra lateral
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-gray-800">{selected.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selected.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {selected.active ? 'ativo' : 'inativo'}
              </span>
              <span className="text-xs text-gray-400">/{selected.slug}</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b">
              {tabs.map(t => (
                <button key={t.key} onClick={() => switchTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <Card className="max-w-2xl">
              <CardContent className="p-6">
                {tab === 'info' && (
                  <>
                    <F label="Nome" fkey="name" form={form} setForm={setForm}/>
                    <F label="Nome legal" fkey="legal_name" form={form} setForm={setForm}/>
                    <div className="mb-3 flex items-center gap-2">
                      <input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4"/>
                      <label className="text-sm text-gray-700">Ativo</label>
                    </div>
                    <F label="Domínios (separados por vírgula)" fkey="domains" placeholder="dominio.com.br, www.dominio.com.br" form={form} setForm={setForm}/>
                    <F label="Domínio de e-mail permitido" fkey="allowed_email_domain" placeholder="@empresa.com.br" form={form} setForm={setForm}/>
                    <F label="E-mail remetente" fkey="sender_email" type="email" form={form} setForm={setForm}/>
                    <F label="Nome remetente" fkey="sender_name" form={form} setForm={setForm}/>
                    <F label="Destinatários do relatório (vírgula)" fkey="report_recipients" placeholder="a@empresa.com, b@empresa.com" form={form} setForm={setForm}/>
                    <F label="Chave Brevo (deixe em branco para não alterar)" fkey="brevo_api_key" type="password" form={form} setForm={setForm}/>
                  </>
                )}

                {tab === 'branding' && (
                  <>
                    <p className="text-xs text-gray-400 mb-4">Cores da marca — afetam Quiz, Admin e e-mails</p>
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-xs text-purple-700 mb-2">✨ Gere a paleta automaticamente a partir da logo</p>
                      <Button size="sm" onClick={generatePalette} disabled={generatingPalette} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                        {generatingPalette ? '⏳ Analisando logo...' : '🎨 Gerar paleta com IA'}
                      </Button>
                    </div>
                    <Color label="Navy (cor principal)" fkey="navy" form={form} setForm={setForm}/>
                    <Color label="Navy Alt" fkey="navyAlt" form={form} setForm={setForm}/>
                    <Color label="Gold (destaque)" fkey="gold" form={form} setForm={setForm}/>
                    <Color label="Gold Alt" fkey="goldAlt" form={form} setForm={setForm}/>
                    <Color label="Cream (fundo)" fkey="cream" form={form} setForm={setForm}/>
                    <Color label="Cream Alt" fkey="creamAlt" form={form} setForm={setForm}/>
                    <Color label="Flag Blue (barra bandeira)" fkey="flagBlue" form={form} setForm={setForm}/>
                    <Color label="Flag Red (barra bandeira)" fkey="flagRed" form={form} setForm={setForm}/>
                    <Color label="Gold do e-mail (deixe vazio para usar o Gold acima)" fkey="goldEmail" form={form} setForm={setForm}/>
                  </>
                )}

                {tab === 'contact' && (
                  <>
                    <F label="WhatsApp (só números, ex: 554197177910)" fkey="whatsapp" form={form} setForm={setForm}/>
                    <F label="Telefone" fkey="phone" form={form} setForm={setForm}/>
                    <F label="E-mail de contato" fkey="email" type="email" form={form} setForm={setForm}/>
                    <F label="Instagram (ex: @empresa)" fkey="instagram" form={form} setForm={setForm}/>
                    <F label="Website (ex: empresa.com.br)" fkey="website" form={form} setForm={setForm}/>
                  </>
                )}

                {tab === 'copy' && (
                  <>
                    <F label="Taxa de aprovação EB-2 NIW / EB-1A" fkey="approvalRateEbNiwEb1a" placeholder="82%" form={form} setForm={setForm}/>
                    <F label="Taxa de aprovação L-1A / O-1A" fkey="approvalRateL1aO1a" placeholder="96%" form={form} setForm={setForm}/>
                    <F label="Tagline do rodapé" fkey="footerTagline" type="textarea" form={form} setForm={setForm}/>
                    <F label="Copyright do rodapé" fkey="footerCopyright" placeholder="© 2026 Empresa • Todos os direitos reservados" form={form} setForm={setForm}/>
                    <F label="Endereço do rodapé" fkey="footerAddress" placeholder="CNPJ: ... • Endereço..." form={form} setForm={setForm}/>
                    <F label="Outros Serviços do rodapé" fkey="footerServices" type="textarea" placeholder={"Cidadania Portuguesa\nCidadania Espanhola\nCidadania Italiana"} form={form} setForm={setForm}/>
                    <p className="text-xs text-gray-400 -mt-2">Um serviço por linha</p>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-300">Rodapé escuro</label>
                      <button
                        type="button"
                        onClick={() => setForm((f: Record<string, unknown>) => ({...f, footerDark: !f.footerDark}))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.footerDark ? 'bg-blue-600' : 'bg-gray-500'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.footerDark ? 'translate-x-6' : 'translate-x-1'}`}/>
                      </button>
                      <span className="text-xs text-gray-400">{form.footerDark ? 'Escuro (navy)' : 'Claro (creme)'}</span>
                    </div>
                    <F label="GTM ID" fkey="gtmId" placeholder="GTM-XXXXXXX" form={form} setForm={setForm}/>
                  </>
                )}

                {tab === 'team' && (
                  <>
                    <F label="Nomes dos responsáveis (separados por vírgula)" fkey="assignees" placeholder="Amanda, Julia, Maria" form={form} setForm={setForm}/>
                    <p className="text-xs text-gray-400 mt-1">Aparecem no dropdown de responsável no Admin</p>
                  </>
                )}

                {tab === 'assets' && (
                  <>
                    <p className="text-xs text-gray-400 mb-4">Upload de imagens para o Supabase Storage (substituem as URLs do Mocha)</p>
                    <div className="space-y-4">
                      {[
                        { key: 'logoUrl', label: 'Logo principal (fundo claro)', current: selected.assets?.logoUrl as string },
                        { key: 'logoLight', label: 'Logo para fundo escuro (footer)', current: selected.assets?.logoLight as string },
                        { key: 'ogImageUrl', label: 'Imagem OG (redes sociais)', current: selected.assets?.ogImageUrl as string },
                        { key: 'proofImage', label: 'Prova social (adiciona à lista)', current: null },
                      ].map(asset => (
                        <div key={asset.key} className="border rounded p-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">{asset.label}</p>
                          {asset.current && (
                            <div className="mb-2 flex items-start gap-3">
                              <img src={asset.current} alt="" className="h-12 object-contain border rounded bg-gray-50"/>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-400 break-all">{asset.current}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteAsset(asset.key)}
                                disabled={deletingAsset === asset.key}
                                className="text-xs text-red-600 border-red-300 hover:bg-red-50 shrink-0"
                              >
                                {deletingAsset === asset.key ? '...' : 'Excluir'}
                              </Button>
                            </div>
                          )}
                          <div className="flex gap-2 items-center flex-wrap">
                            <label className="cursor-pointer">
                              <span className="inline-flex items-center px-2 py-1 border rounded text-xs bg-white hover:bg-gray-50 border-gray-300 text-gray-700">
                                {selectedFiles[asset.key] ? `📎 ${selectedFiles[asset.key]}` : 'Escolher arquivo'}
                              </span>
                              <input
                                ref={el => { fileRefs.current[asset.key] = el; }}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                className="hidden"
                                onChange={e => {
                                  const name = e.target.files?.[0]?.name ?? '';
                                  setSelectedFiles(prev => name ? { ...prev, [asset.key]: name } : prev);
                                }}
                              />
                            </label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => uploadAsset(asset.key)}
                              disabled={uploading || !selectedFiles[asset.key]}
                              className="text-xs"
                            >
                              {uploading ? 'Enviando...' : 'Upload'}
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Proof images list */}
                      {Array.isArray(selected.assets?.proofImages) && (selected.assets.proofImages as string[]).length > 0 && (
                        <div className="border rounded p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Imagens de prova social ({(selected.assets.proofImages as string[]).length})</p>
                          <div className="flex gap-2 flex-wrap">
                            {(selected.assets.proofImages as string[]).map((url, i) => (
                              <div key={i} className="relative group">
                                <img src={url} alt={`Prova ${i+1}`} className="h-16 object-cover rounded border"/>
                                <button
                                  onClick={() => deleteAsset('proofImage', url)}
                                  className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remover"
                                >✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {tab === 'users' && (
                  <>
                    <p className="text-xs text-gray-400 mb-4">
                      Usuários com acesso ao painel admin deste tenant.
                      {selected.allowed_email_domain && ` Domínio exigido: ${selected.allowed_email_domain}`}
                    </p>

                    {/* Convidar */}
                    <div className="flex gap-2 mb-6">
                      <input
                        type="email"
                        placeholder="email@empresa.com"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && inviteUser()}
                        className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <Button size="sm" onClick={inviteUser} disabled={inviting || !inviteEmail.trim()}>
                        {inviting ? 'Enviando...' : 'Convidar'}
                      </Button>
                    </div>

                    {/* Lista */}
                    {tenantUsers.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Nenhum usuário ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {tenantUsers.map(u => (
                          <div key={u.user_id} className="flex items-center justify-between p-3 border rounded bg-white">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{u.email}</p>
                              <p className="text-xs text-gray-400">
                                {u.role} · desde {new Date(u.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              onClick={() => removeUser(u.user_id)}
                            >
                              Remover
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg && <p className={`mt-4 text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
                  </>
                )}

                {tab !== 'assets' && tab !== 'users' && (
                  <div className="mt-6 flex items-center gap-3">
                    <Button onClick={save} disabled={saving} size="sm">
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                    {msg && <span className={`text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>}
                  </div>
                )}
                {tab === 'assets' && msg && (
                  <p className={`mt-4 text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SuperAdmin;
