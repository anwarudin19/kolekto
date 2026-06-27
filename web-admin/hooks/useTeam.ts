'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { api, buildQuery } from '@/lib/api';
import { getStoredToken, getStoredUser } from '@/lib/auth';
import type { Team, TeamMember, PaginatedResponse } from '@/types';

// ─── Active team stored in localStorage ──────────────────────────────────────
const ACTIVE_TEAM_KEY = 'kolekto-active-team';
const TEAM_CHANGE_EVENT = 'kolekto-team-change';

export function getStoredTeamId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_TEAM_KEY);
}

export function setStoredTeamId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_TEAM_KEY, id);
  window.dispatchEvent(new Event(TEAM_CHANGE_EVENT));
}

function subscribeTeamId(cb: () => void) {
  window.addEventListener(TEAM_CHANGE_EVENT, cb);
  return () => window.removeEventListener(TEAM_CHANGE_EVENT, cb);
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Ambil seluruh tim dengan menelusuri semua halaman.
 * Backend membatasi limit maksimal 100/halaman, jadi untuk menampung >100 tim
 * (mis. data load-test) switcher harus melooping halaman.
 */
async function fetchAllTeams(buildUrl: (page: number) => string): Promise<PaginatedResponse<Team>> {
  const all: Team[] = [];
  let page = 1;
  let meta: PaginatedResponse<Team>['meta'] = { page: 1, limit: 100, total: 0, totalPages: 1 };
  for (let guard = 0; guard < 50; guard++) {
    const res = await api.get<PaginatedResponse<Team>>(buildUrl(page));
    all.push(...res.data.data);
    meta = res.data.meta;
    if (page >= (res.data.meta?.totalPages ?? 1)) break;
    page += 1;
  }
  return { data: all, meta: { ...meta, page: 1, limit: all.length, totalPages: 1 } };
}

/** Fetch teams. Super Admin menggunakan /admin/teams, user biasa /teams. */
export function useTeams() {
  const user = getStoredUser();
  const token = getStoredToken();
  const isSuperAdmin = user?.isSuperAdmin ?? user?.role === 'SUPER_ADMIN';

  return useQuery<PaginatedResponse<Team>>({
    queryKey: ['teams', isSuperAdmin ? 'admin' : 'user'],
    queryFn: async () =>
      isSuperAdmin
        ? fetchAllTeams((p) => `/admin/teams?limit=100&page=${p}&status=ACTIVE`)
        : fetchAllTeams((p) => `/teams?limit=100&page=${p}`),
    enabled: !!token,
  });
}

export function useTeam(teamId: string | null) {
  return useQuery<Team>({
    queryKey: ['teams', teamId],
    queryFn: async () => {
      const res = await api.get<Team>(`/teams/${teamId}`);
      return res.data;
    },
    enabled: !!teamId,
  });
}

export function useMembers(teamId: string | null, params?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<TeamMember>>({
    queryKey: ['members', teamId, params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<TeamMember>>(
        `/teams/${teamId}/members${buildQuery(params ?? {})}`,
      );
      return res.data;
    },
    enabled: !!teamId,
  });
}

/**
 * Kembalikan teamId aktif — reaktif terhadap perubahan tim.
 * Priority: localStorage → first team dari list.
 */
export function useActiveTeamId(): string | null {
  const storedId = useSyncExternalStore(subscribeTeamId, getStoredTeamId, () => null);
  const { data: teams } = useTeams();
  const list = teams?.data ?? [];
  if (list.length === 0) return null;
  if (storedId && list.some(t => t.id === storedId)) return storedId;
  return list[0].id;
}
