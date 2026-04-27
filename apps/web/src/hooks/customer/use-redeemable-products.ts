'use client';

import { useQuery } from '@tanstack/react-query';
import { customerFetch } from '@/lib/customer-api';
import { useCustomerStore } from '@/stores/customer-store';
import type { RedeemableResponse } from '@cardapio/shared';

export function useRedeemableProducts() {
  const token = useCustomerStore((s) => s.token);
  const hasPassword = useCustomerStore((s) => s.hasPassword);

  return useQuery<RedeemableResponse>({
    queryKey: ['customer-redeemable'],
    queryFn: () => customerFetch('/api/customers/loyalty/redeemable'),
    enabled: !!token && hasPassword,
  });
}
