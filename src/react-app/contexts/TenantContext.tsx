import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { TenantPublicConfig } from '../../../api/_lib/tenant-schema';

interface TenantContextValue {
  tenant: TenantPublicConfig | null;
  loading: boolean;
  slug: string | undefined;
}

const TenantContext = createContext<TenantContextValue>({ tenant: null, loading: true, slug: undefined });

export function TenantProvider({ children, slug }: { children: ReactNode; slug?: string }) {
  const [tenant, setTenant] = useState<TenantPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = slug ? `/api/tenant/config?tenant=${slug}` : '/api/tenant/config';
    fetch(url)
      .then((res) => res.json())
      .then((data: TenantPublicConfig) => {
        setTenant(data);
        injectCssVars(data);
      })
      .catch((err) => {
        console.error('Failed to load tenant config:', err);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <TenantContext.Provider value={{ tenant, loading, slug }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

function injectCssVars(config: TenantPublicConfig) {
  const t = config.theme;
  const root = document.documentElement;
  root.style.setProperty('--color-navy',      t.navy);
  root.style.setProperty('--color-navy-alt',  t.navyAlt);
  root.style.setProperty('--color-gold',      t.gold);
  root.style.setProperty('--color-gold-alt',  t.goldAlt);
  root.style.setProperty('--color-cream',     t.cream);
  root.style.setProperty('--color-cream-alt', t.creamAlt);
  root.style.setProperty('--color-flag-blue', t.flagBlue);
  root.style.setProperty('--color-flag-red',  t.flagRed);

  // Inject GTM dynamically if configured and not already injected
  const gtmId = config.tracking?.gtmId;
  if (gtmId && !document.getElementById('gtm-script')) {
    const script = document.createElement('script');
    script.id = 'gtm-script';
    script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.id = 'gtm-noscript';
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(noscript, document.body.firstChild);
  }
}
