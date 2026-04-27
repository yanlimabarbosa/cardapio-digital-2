'use client';

import { useQuery } from '@tanstack/react-query';
import { customerFetch } from '@/lib/customer-api';
import { useCustomerStore } from '@/stores/customer-store';
import type { LoyaltyResponse } from '@cardapio/shared';

export function useLoyalty(page = 1, limit = 10) {
  const token = useCustomerStore((s) => s.token);

  return useQuery<LoyaltyResponse>({
    queryKey: ['customer-loyalty', page, limit],
    queryFn: () =>
      customerFetch(`/api/customers/loyalty?page=${page}&limit=${limit}`),
    enabled: !!token,
  });
}
