'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Product } from '@cardapio/shared';

export function useFeatured() {
  return useQuery<Product[]>({
    queryKey: ['featured'],
    queryFn: () => apiFetch('/api/menu/featured'),
    staleTime: 60 * 1000,
  });
}
