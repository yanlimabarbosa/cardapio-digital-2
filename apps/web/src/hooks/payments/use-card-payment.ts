'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CreateCardPaymentDto, CardPaymentResponse } from '@cardapio/shared';

export function useCardPayment() {
  return useMutation<CardPaymentResponse, Error, CreateCardPaymentDto>({
    mutationFn: (data) =>
      apiFetch('/api/payments/credit-card', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
