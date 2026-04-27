'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CustomerData } from '@/stores/customer-store';

interface IdentifyResponse {
  exists: boolean;
  hasPassword?: boolean;
  action: 'register' | 'login' | 'authenticated';
  token?: string;
  customer?: CustomerData;
}

export function useCustomerIdentify() {
  return useMutation<IdentifyResponse, Error, string>({
    mutationFn: (phone) =>
      apiFetch('/api/customers/identify', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
  });
}
