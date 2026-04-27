'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { DeliveryAreaResponse } from '@cardapio/shared';

export function useDeliveryAreas() {
  return useQuery<DeliveryAreaResponse[]>({
    queryKey: ['delivery-areas'],
    queryFn: () => apiFetch('/api/delivery-areas'),
    staleTime: 5 * 60 * 1000,
  });
}
