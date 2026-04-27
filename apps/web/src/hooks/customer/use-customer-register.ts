'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CustomerData } from '@/stores/customer-store';

interface RegisterRequest {
  phone: string;
  name: string;
  password: string;
}

interface RegisterResponse {
  token: string;
  customer: CustomerData;
}

export function useCustomerRegister() {
  return useMutation<RegisterResponse, Error, RegisterRequest>({
    mutationFn: (data) =>
      apiFetch('/api/customers/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
