'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, buildQuery } from '@/lib/api';
import type { Transaction, PaginatedResponse } from '@/types';

export function useTransactions(teamId: string | null, params?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<Transaction>>({
    queryKey: ['transactions', teamId, params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Transaction>>(
        `/teams/${teamId}/transactions${buildQuery(params ?? {})}`,
      );
      return res.data;
    },
    enabled: !!teamId,
  });
}

export function useCreateExpense(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post(`/teams/${teamId}/transactions/expense`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', teamId] });
      qc.invalidateQueries({ queryKey: ['accounts', teamId] });
    },
  });
}
