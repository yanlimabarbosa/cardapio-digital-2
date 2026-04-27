'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Product } from '@cardapio/shared';

export interface PublicSection {
  id: string;
  label: string;
  emoji: string;
  products: Product[];
}

export function useSections() {
  return useQuery<PublicSection[]>({
    queryKey: ['sections'],
    queryFn: () => apiFetch('/api/menu/sections'),
    staleTime: 60 * 1000,
  });
}
