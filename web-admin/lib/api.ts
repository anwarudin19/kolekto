import axios, { AxiosError, type AxiosInstance } from 'axios';
import { clearStoredAuth, getStoredAuth, getStoredToken, isLogoutRequested } from './auth';
import type { ApiErrorShape } from '@/types';

type ApiHandlers = {
  onUnauthorized?: (email?: string, expiredToken?: string) => void;
  onForbidden?: (error: ApiErrorShape) => void;
  onError?: (error: ApiErrorShape) => void;
};

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export const api: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

export const publicApi: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

let _handlers: ApiHandlers = {};

export function registerApiHandlers(h: ApiHandlers) {
  _handlers = h;
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<Record<string, unknown>>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isPublicAuth =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/logout');
    const normalized = normalizeApiError(error);

    if (status === 401 && !isPublicAuth && !isLogoutRequested()) {
      const auth = getStoredAuth();
      clearStoredAuth();
      _handlers.onUnauthorized?.(auth?.user?.email, auth?.accessToken);
    }
    if (status === 403) _handlers.onForbidden?.(normalized);
    if (status && status >= 400 && status !== 401 && status !== 403) {
      _handlers.onError?.(normalized);
    }

    return Promise.reject(normalized);
  },
);

export function normalizeApiError(error: unknown): ApiErrorShape {
  if (axios.isAxiosError(error)) {
    const d = error.response?.data as Record<string, unknown> | undefined;
    const message = normalizeMessage(d?.message, d?.error ?? error.message);
    return {
      status: error.response?.status,
      message,
      fields:
        (d?.errors as Record<string, string[]>) ??
        (d?.fieldErrors as Record<string, string[]>) ??
        ((d?.details as Record<string, unknown>)?.errors as Record<string, string[]>),
    };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: 'Terjadi kesalahan' };
}

function normalizeMessage(msg: unknown, fallback: unknown): string {
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.filter((s): s is string => typeof s === 'string').join(', ');
  if (typeof fallback === 'string') return fallback;
  return 'Terjadi kesalahan';
}

export function getApiErrorTitle(error: unknown, fallback = 'Terjadi kesalahan') {
  const { status, message } = normalizeApiError(error);
  const m = message.toLowerCase();
  switch (status) {
    case 401: return 'Tidak diizinkan';
    case 403: return m.includes('license') || m.includes('plan') ? 'Batas lisensi' : 'Akses ditolak';
    case 404: return 'Tidak ditemukan';
    case 429: return 'Terlalu banyak permintaan';
    case 500: return 'Kesalahan server';
    default:  return status ? `Error ${status}` : fallback;
  }
}

export function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export async function apiRequest<T>(req: Promise<{ data: T }>): Promise<T> {
  return (await req).data;
}
