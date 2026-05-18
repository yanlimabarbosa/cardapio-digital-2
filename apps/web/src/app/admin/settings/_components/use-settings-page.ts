'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-api';
import { useAuthStore } from '@/stores/auth-store';
import type { StoreSettingsData } from '@/types/admin';

type StoreMode = 'schedule' | 'force_open' | 'force_close';

interface StoreStatus {
  open: boolean;
  reason?: string;
}

export function useSettingsPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data: storeSettings, isLoading: settingsLoading } = useQuery<StoreSettingsData>({
    queryKey: ['admin-store-settings'],
    queryFn: () => adminFetch('/api/admin/store-settings', token),
  });

  const { data: storeStatus } = useQuery<StoreStatus>({
    queryKey: ['store-status'],
    queryFn: () => adminFetch('/api/store/status', token),
    refetchInterval: 30000,
  });

  const invalidateStore = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-store-settings'] });
    queryClient.invalidateQueries({ queryKey: ['store-status'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['menu'] });
    queryClient.invalidateQueries({ queryKey: ['sections'] });
    queryClient.invalidateQueries({ queryKey: ['marketing-settings'] });
  };

  const setStoreModeMutation = useMutation({
    mutationFn: (mode: StoreMode) => {
      const payload = {
        forceClose: mode === 'force_close',
        forceOpen: mode === 'force_open',
      };
      return adminFetch('/api/admin/store-settings', token, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: invalidateStore,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<StoreSettingsData>) =>
      adminFetch('/api/admin/store-settings', token, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: invalidateStore,
  });

  const storeMode: StoreMode = storeSettings?.forceClose
    ? 'force_close'
    : storeSettings?.forceOpen
      ? 'force_open'
      : 'schedule';

  return {
    storeSettings,
    storeStatus,
    storeMode,
    settingsLoading,
    setStoreModeMutation,
    updateSettingsMutation,
  };
}
