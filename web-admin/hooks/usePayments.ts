'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, buildQuery } from '@/lib/api';
import type { ContributionPayment, PaginatedResponse } from '@/types';

type RawPayment = Record<string, any>;

function toNum(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizePayment(raw: RawPayment): ContributionPayment {
  const invoice = raw.invoice
    ? {
        id: String(raw.invoice.id ?? ''),
        code: String(raw.invoice.code ?? raw.invoice.invoiceCode ?? ''),
        teamId: String(raw.invoice.teamId ?? ''),
        userId: String(raw.invoice.userId ?? ''),
        roleId: String(raw.invoice.roleId ?? ''),
        periodDate: String(raw.invoice.periodDate ?? ''),
        dueDate: String(raw.invoice.dueDate ?? ''),
        amount: toNum(raw.invoice.amount),
        paidAmount: toNum(raw.invoice.paidAmount),
        status: String(raw.invoice.status ?? 'UNPAID') as any,
        createdAt: String(raw.invoice.createdAt ?? ''),
        updatedAt: String(raw.invoice.updatedAt ?? ''),
      }
    : undefined;

  return {
    id: String(raw.id ?? ''),
    invoiceId: String(raw.invoiceId ?? raw.invoice?.id ?? ''),
    userId: String(raw.userId ?? raw.user?.id ?? ''),
    accountId: String(raw.accountId ?? raw.account?.id ?? ''),
    amount: toNum(raw.amount),
    proofUrl: raw.proofUrl ?? null,
    status: String(raw.status ?? 'PENDING') as ContributionPayment['status'],
    notes: raw.notes ?? raw.note ?? null,
    approvedById: raw.approvedById ?? null,
    rejectedById: raw.rejectedById ?? null,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ''),
    invoice: invoice as ContributionPayment['invoice'],
    account: raw.account
      ? {
          ...raw.account,
          balance: raw.account.balance !== undefined ? toNum(raw.account.balance) : raw.account.balance,
        }
      : undefined,
    submittedBy: raw.submittedBy
      ? raw.submittedBy
      : raw.user
      ? {
          fullName: String(raw.user.fullName ?? raw.user.name ?? '-'),
          email: String(raw.user.email ?? ''),
        }
      : undefined,
  };
}

export function usePendingPayments(teamId: string | null) {
  return useQuery<PaginatedResponse<ContributionPayment>>({
    queryKey: ['payments', teamId, 'pending'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<RawPayment>>(
        `/teams/${teamId}/payments${buildQuery({ status: 'PENDING' })}`,
      );
      return {
        ...res.data,
        data: (res.data.data ?? []).map((item) => normalizePayment(item)),
      };
    },
    enabled: !!teamId,
  });
}

export function usePayments(teamId: string | null, params?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<ContributionPayment>>({
    queryKey: ['payments', teamId, params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<RawPayment>>(
        `/teams/${teamId}/payments${buildQuery(params ?? {})}`,
      );
      return {
        ...res.data,
        data: (res.data.data ?? []).map((item) => normalizePayment(item)),
      };
    },
    enabled: !!teamId,
  });
}

export function useApprovePayment(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, notes }: { paymentId: string; notes?: string }) => {
      const res = await api.post(`/payments/${paymentId}/approve`, { notes });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', teamId] });
      qc.invalidateQueries({ queryKey: ['invoices', teamId] });
    },
  });
}

export function useSubmitPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, accountId, amount, note, proof }: {
      invoiceId: string; accountId: string; amount: number; note?: string; proof?: File;
    }) => {
      const fd = new FormData();
      fd.append('accountId', accountId);
      fd.append('amount', String(amount));
      if (note) fd.append('note', note);
      if (proof) fd.append('proof', proof);

      const res = await api.post(`/invoices/${invoiceId}/payments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRejectPayment(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, notes }: { paymentId: string; notes?: string }) => {
      const res = await api.post(`/payments/${paymentId}/reject`, { notes });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', teamId] });
      qc.invalidateQueries({ queryKey: ['invoices', teamId] });
    },
  });
}
