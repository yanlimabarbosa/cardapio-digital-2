'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CreatePixPaymentDto, PixPaymentResponse } from '@cardapio/shared';

export function usePixPayment() {
  return useMutation<PixPaymentResponse, Error, CreatePixPaymentDto>({
    mutationFn: (data) =>
      apiFetch('/api/payments/pix', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
