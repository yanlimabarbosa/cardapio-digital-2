'use client';

import { useMutation } from '@tanstack/react-query';
import { customerFetch } from '@/lib/customer-api';
import type { CustomerData } from '@/stores/customer-store';

interface SetPasswordResponse {
  customer: CustomerData;
}

export function useCustomerSetPassword() {
  return useMutation<SetPasswordResponse, Error, string>({
    mutationFn: (password) =>
      customerFetch('/api/customers/set-password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
  });
}
