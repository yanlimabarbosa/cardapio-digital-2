'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface MarketingSettings {
  metaPixelEnabled: boolean;
  metaPixelIds: string[];
}

export function useMarketingSettings() {
  return useQuery<MarketingSettings>({
    queryKey: ['marketing-settings'],
    queryFn: () => apiFetch('/api/store/marketing-settings'),
    staleTime: 5 * 60 * 1000,
  });
}
