'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PixPaymentResponse } from '@cardapio/shared';

export function usePixPayment() {
  return useMutation<PixPaymentResponse, Error, string>({
    mutationFn: (orderId) =>
      apiFetch('/api/payments/pix', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      }),
  });
}
