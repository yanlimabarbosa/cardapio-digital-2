'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CreateDebitCardPaymentDto, DebitCardPaymentResponse } from '@cardapio/shared';

export function useDebitCardPayment() {
  return useMutation<DebitCardPaymentResponse, Error, CreateDebitCardPaymentDto>({
    mutationFn: (data) =>
      apiFetch('/api/payments/debit-card', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
