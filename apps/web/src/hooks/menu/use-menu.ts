'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MenuResponse } from '@cardapio/shared';

export function useMenu(scheduledFor?: string | null) {
  const query = scheduledFor ? `?scheduledFor=${encodeURIComponent(scheduledFor)}` : '';
  return useQuery<MenuResponse>({
    queryKey: ['menu', scheduledFor ?? 'now'],
    queryFn: () => apiFetch(`/api/menu${query}`),
  });
}
