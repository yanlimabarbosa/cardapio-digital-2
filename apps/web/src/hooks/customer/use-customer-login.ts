'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CustomerData } from '@/stores/customer-store';

interface LoginRequest {
  phone: string;
  password: string;
}

interface LoginResponse {
  token: string;
  customer: CustomerData;
}

export function useCustomerLogin() {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (data) =>
      apiFetch('/api/customers/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
