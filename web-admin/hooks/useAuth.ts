'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, publicApi } from '@/lib/api';
import {
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
  setLogoutRequested,
} from '@/lib/auth';
import type { AuthSession, AuthUser } from '@/types';

// ─── Session query ────────────────────────────────────────────────────────────
export function useSession() {
  return useQuery<AuthSession | null>({
    queryKey: ['auth', 'session'],
    queryFn: () => getStoredAuth(),
    staleTime: Infinity,
  });
}

export function useUser(): AuthUser | null {
  const { data } = useSession();
  return data?.user ?? null;
}

// ─── Login ────────────────────────────────────────────────────────────────────
type LoginPayload = { email: string; password: string };

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await publicApi.post<AuthSession>('/auth/login', payload);
      return res.data;
    },
    onSuccess: (session) => {
      setLogoutRequested(false);
      setStoredAuth(session);
      qc.setQueryData(['auth', 'session'], session);
    },
  });
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      setLogoutRequested(true);
      try { await api.post('/auth/logout'); } catch { /* ignore */ }
    },
    onSettled: () => {
      clearStoredAuth();
      qc.clear();
    },
  });
}

// ─── Me (re-fetch user from server) ──────────────────────────────────────────
export function useMe() {
  return useQuery<AuthUser>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get<AuthUser>('/auth/me');
      return res.data;
    },
    enabled: !!getStoredToken(),
  });
}

function getStoredToken() {
  return getStoredAuth()?.accessToken ?? null;
}
