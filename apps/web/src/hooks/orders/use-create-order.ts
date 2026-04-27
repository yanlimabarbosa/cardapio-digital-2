'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { getCustomerHeaders } from '@/lib/customer-api';
import type { CreateOrderDto, OrderResponse } from '@cardapio/shared';

export function useCreateOrder() {
  return useMutation<OrderResponse & { customerToken?: string }, Error, CreateOrderDto>({
    mutationFn: (data) =>
      apiFetch('/api/orders', {
        method: 'POST',
        headers: getCustomerHeaders(),
        body: JSON.stringify(data),
      }),
  });
}
