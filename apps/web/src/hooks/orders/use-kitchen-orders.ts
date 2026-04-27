'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import type { OrderResponse } from '@cardapio/shared';

export function useKitchenOrders() {
  const token = useAuthStore((s) => s.token);

  return useQuery<OrderResponse[]>({
    queryKey: ['kitchen-orders'],
    queryFn: () => adminFetch('/api/orders/kitchen', token),
    refetchInterval: 30000,
    enabled: !!token,
  });
}
