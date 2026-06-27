'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { registerApiHandlers, getApiErrorTitle, api } from '@/lib/api';
import { setStoredAuth, clearStoredAuth, setLogoutRequested } from '@/lib/auth';
import type { AuthSession } from '@/types';
import { SessionTimeoutModal } from '@/components/shared/SessionTimeoutModal';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';

// ─── Toast context ────────────────────────────────────────────────────────────
type ToastItem = { id: number; message: string; variant?: 'success' | 'error' | 'default' };
type ToastCtx = { push: (msg: string, variant?: ToastItem['variant']) => void };
const ToastContext = createContext<ToastCtx>({ push: () => {} });
export const useToast = () => useContext(ToastContext);

let toastId = 0;

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, variant: ToastItem['variant'] = 'default') => {
    const id = ++toastId;
    setItems((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-host">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.variant === 'success' ? 'success' : t.variant === 'error' ? 'error' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── API bridge ───────────────────────────────────────────────────────────────
function ApiBridge() {
  const router = useRouter();
  const { push } = useToast();
  const handling = useRef(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const expiredToken = useRef<string | null>(null);

  useEffect(() => {
    registerApiHandlers({
      onUnauthorized: (email, token) => {
        if (handling.current) return;
        handling.current = true;
        expiredToken.current = token ?? null;
        queryClient.setQueryData(['auth', 'session'], null);
        setSessionEmail(email ?? '');
      },
      onForbidden: (err) => push(err.message || 'Akses ditolak', 'error'),
      onError: (err) => push(err.message || 'Terjadi kesalahan', 'error'),
    });
  }, [push]);

  const handleContinue = async () => {
    const token = expiredToken.current;
    if (!token) throw new Error('Token sesi tidak tersedia');

    const res = await api.post<AuthSession>(
      '/auth/refresh', {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setLogoutRequested(false);
    setStoredAuth(res.data);
    queryClient.setQueryData(['auth', 'session'], res.data);
    expiredToken.current = null;
    setSessionEmail(null);
    handling.current = false;
    void queryClient.invalidateQueries().catch(() => {});
  };

  const handleLogout = () => {
    setLogoutRequested(true);
    clearStoredAuth();
    expiredToken.current = null;
    setSessionEmail(null);
    handling.current = false;
    queryClient.clear();
    router.replace('/login');
  };

  return (
    <SessionTimeoutModal
      open={sessionEmail !== null}
      onStay={handleContinue}
      onLogout={handleLogout}
      seconds={60}
    />
  );
}

// ─── Root providers ───────────────────────────────────────────────────────────
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ApiBridge />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
