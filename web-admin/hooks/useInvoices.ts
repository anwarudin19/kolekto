'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, buildQuery } from '@/lib/api';
import type { Invoice, PaginatedResponse } from '@/types';

type RawInvoice = Record<string, any>;

function toNum(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeInvoice(raw: RawInvoice): Invoice {
  const payments = Array.isArray(raw.payments) ? raw.payments : [];
  const paidAmountFromPayments = payments
    .filter((p: any) => p?.status === 'APPROVED')
    .reduce((sum: number, p: any) => sum + toNum(p?.amount), 0);

  const user = raw.user ?? {};
  const role = raw.role ?? undefined;
  const amount = toNum(raw.amount);
  const paidAmount = raw.paidAmount !== undefined ? toNum(raw.paidAmount) : paidAmountFromPayments;

  return {
    id: String(raw.id ?? ''),
    code: String(raw.code ?? raw.invoiceCode ?? ''),
    teamId: String(raw.teamId ?? ''),
    userId: String(raw.userId ?? user.id ?? ''),
    roleId: String(raw.roleId ?? role?.id ?? ''),
    periodDate: String(raw.periodDate ?? raw.createdAt ?? ''),
    dueDate: String(raw.dueDate ?? raw.createdAt ?? ''),
    amount,
    paidAmount,
    status: String(raw.status ?? 'UNPAID') as Invoice['status'],
    notes: raw.notes ?? raw.note ?? null,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ''),
    member: raw.member ?? (user?.id ? {
      id: String(user.id),
      teamId: String(raw.teamId ?? ''),
      userId: String(user.id),
      memberName: String(user.fullName ?? user.name ?? '-'),
      systemRole: 'MEMBER',
      status: 'ACTIVE',
      createdAt: String(raw.createdAt ?? new Date().toISOString()),
      user: {
        email: String(user.email ?? ''),
        fullName: String(user.fullName ?? user.name ?? '-'),
      },
    } : undefined),
    role: role ? {
      ...role,
      feeAmount: toNum(role.feeAmount),
    } : undefined,
    payments: payments as Invoice['payments'],
  };
}

function sanitizeQuery(params?: Record<string, unknown>) {
  if (!params) return {};
  const next: Record<string, unknown> = { ...params };
  if (typeof next.limit === 'number' && next.limit > 100) next.limit = 100;
  if (typeof next.limit === 'string') {
    const parsed = Number(next.limit);
    if (Number.isFinite(parsed) && parsed > 100) next.limit = 100;
  }
  return next;
}

export function useInvoices(teamId: string | null, params?: Record<string, unknown>) {
  const safeParams = sanitizeQuery(params);
  return useQuery<PaginatedResponse<Invoice>>({
    queryKey: ['invoices', teamId, safeParams],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<RawInvoice>>(
        `/teams/${teamId}/invoices${buildQuery(safeParams)}`,
      );
      return {
        ...res.data,
        data: (res.data.data ?? []).map((item) => normalizeInvoice(item)),
      };
    },
    enabled: !!teamId,
  });
}

/** Invoice milik user yang login saja (untuk MEMBER) — endpoint /invoices/me. */
export function useMyInvoices(enabled: boolean, params?: Record<string, unknown>) {
  const safeParams = sanitizeQuery(params);
  return useQuery<PaginatedResponse<Invoice>>({
    queryKey: ['invoices', 'me', safeParams],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<RawInvoice>>(`/invoices/me${buildQuery(safeParams)}`);
      return {
        ...res.data,
        data: (res.data.data ?? []).map((item) => normalizeInvoice(item)),
      };
    },
    enabled,
  });
}

export function useInvoice(id: string | null) {
  return useQuery<Invoice>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await api.get<RawInvoice>(`/invoices/${id}`);
      return normalizeInvoice(res.data);
    },
    enabled: !!id,
  });
}

export function useGenerateInvoices(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodDate }: { periodDate?: string }) => {
      const res = await api.post(`/teams/${teamId}/invoices/generate`, periodDate ? { periodDate } : {});
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices', teamId] });
      qc.invalidateQueries({ queryKey: ['payments', teamId] });
      qc.invalidateQueries({ queryKey: ['dashboard', teamId] });
    },
  });
}

export function useUpdateInvoice(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, payload }: {
      invoiceId: string;
      payload: { dueDate?: string; status?: Invoice['status'] };
    }) => {
      const res = await api.patch(`/invoices/${invoiceId}`, payload);
      return normalizeInvoice(res.data);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['invoices', teamId] });
      qc.invalidateQueries({ queryKey: ['invoice', updated.id] });
      qc.invalidateQueries({ queryKey: ['payments', teamId] });
      qc.invalidateQueries({ queryKey: ['dashboard', teamId] });
    },
  });
}
