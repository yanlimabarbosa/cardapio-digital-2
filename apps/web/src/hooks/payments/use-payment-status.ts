'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PaymentStatusResponse } from '@cardapio/shared';

export function usePaymentStatus(orderId: string | null, enabled = false) {
  return useQuery<PaymentStatusResponse>({
    queryKey: ['payment-status', orderId],
    queryFn: () => apiFetch(`/api/payments/${orderId}/status`),
    enabled: !!orderId && enabled,
    refetchInterval: 3000,
  });
}
