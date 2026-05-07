'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { WeeklySchedule } from '@cardapio/shared';

interface StoreStatus {
  open: boolean;
  reason?: string;
  opensAt?: string;
  closesAt?: string;
  openDays?: number[];
  weeklySchedule?: WeeklySchedule;
  nextOpenAt?: string;
  nextOpenLabel?: string;
  bannerUrl?: string;
}

export function useStoreStatus() {
  return useQuery<StoreStatus>({
    queryKey: ['store-status'],
    queryFn: () => apiFetch('/api/store/status'),
    refetchInterval: 60000,
  });
}
