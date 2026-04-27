'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';

export function useUpdateOrderStatus(orderId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (newStatus: string) =>
      adminFetch(`/api/orders/${orderId}/status`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    },
  });
}
