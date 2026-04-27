'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MenuResponse } from '@cardapio/shared';

export function useMenu() {
  return useQuery<MenuResponse>({
    queryKey: ['menu'],
    queryFn: () => apiFetch('/api/menu'),
  });
}
