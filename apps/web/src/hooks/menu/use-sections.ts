'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Product, WeeklySchedule } from '@cardapio/shared';

export interface PublicSection {
  id: string;
  label: string;
  emoji: string;
  availabilitySchedule?: WeeklySchedule | null;
  isAvailable?: boolean;
  availabilityMessage?: string;
  nextAvailableAt?: string;
  products: Product[];
}

export function useSections(scheduledFor?: string | null) {
  const query = scheduledFor ? `?scheduledFor=${encodeURIComponent(scheduledFor)}` : '';
  return useQuery<PublicSection[]>({
    queryKey: ['sections', scheduledFor ?? 'now'],
    queryFn: () => apiFetch(`/api/menu/sections${query}`),
    staleTime: 60 * 1000,
  });
}
