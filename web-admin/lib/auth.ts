import type { AuthSession, AuthUser, Role } from '@/types';

const AUTH_KEY = 'kolekto-auth';
let logoutRequested = false;

export function getStoredAuth(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function setStoredAuth(session: AuthSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_KEY);
}

export function setLogoutRequested(value: boolean) {
  logoutRequested = value;
}

export function isLogoutRequested() {
  return logoutRequested;
}

export function getStoredToken() {
  return getStoredAuth()?.accessToken ?? null;
}

export function getStoredUser(): AuthUser | null {
  return getStoredAuth()?.user ?? null;
}

export function isAdminRole(role?: Role | null) {
  return role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'ADMIN' || role === 'TREASURER';
}

export function isSuperAdmin(role?: Role | null) {
  return role === 'SUPER_ADMIN';
}

export function canUseAdminPanel(role?: Role | null) {
  return role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'ADMIN' || role === 'TREASURER' || role === 'MEMBER';
}

