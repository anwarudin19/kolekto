'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { getStoredAuth, canUseAdminPanel, isSuperAdmin } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const session = getStoredAuth();
    if (!session) {
      router.replace('/login');
      return;
    }
    const role = session.user.role;
    if (!canUseAdminPanel(role)) {
      router.replace('/login');
      return;
    }
    if (pathname.startsWith('/super-admin') && !isSuperAdmin(role)) {
      router.replace('/dashboard');
      return;
    }
    setChecked(true);
  }, [router, pathname]);

  if (!checked) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Memuat...</div>
      </div>
    );
  }

  return (
    <div className={`app layout-sidebar ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      {mobileNavOpen && (
        <div className="mobile-scrim" onClick={() => setMobileNavOpen(false)} />
      )}
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <main className="main">
        <AppHeader onMenuToggle={() => setMobileNavOpen((v) => !v)} />
        {children}
      </main>
    </div>
  );
}
