'use client';

import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Account } from '@/types';

export function useAccounts(teamId: string | null) {
  return useQuery<Account[]>({
    queryKey: ['accounts', teamId],
    queryFn: async () => {
      const res = await api.get<Account[]>(`/teams/${teamId}/accounts`);
      return res.data;
    },
    enabled: !!teamId,
  });
}

export function useAccountBalances(teamId: string | null, accounts: Account[]) {
  return useQueries({
    queries: accounts.map((account) => ({
      queryKey: ['accounts', teamId, account.id, 'balance'],
      queryFn: async () => {
        const res = await api.get<{ accountId: string; balance: number; currency: string }>(
          `/teams/${teamId}/accounts/${account.id}/balance`,
        );
        return res.data;
      },
      enabled: !!teamId && account.balance == null,
    })),
  });
}

export function useCreateAccount(teamId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; type: string; bankName?: string; accountNumber?: string }) => {
      const res = await api.post(`/teams/${teamId}/accounts`, payload);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', teamId] }),
  });
}
