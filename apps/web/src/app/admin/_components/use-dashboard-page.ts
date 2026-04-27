'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, DollarSign, ChefHat, Receipt } from 'lucide-react';
import type { Dashboard, StoreSettingsData } from '@/types/admin';

interface StoreStatus {
  open: boolean;
  reason?: string;
}

export type StoreMode = 'schedule' | 'force_open' | 'force_close';

export function useDashboardPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data } = useQuery<Dashboard>({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminFetch('/api/admin/dashboard', token),
    refetchInterval: 30000,
  });

  const { data: storeSettings } = useQuery<StoreSettingsData>({
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
      adminFetch('/api/admin/store-settings', token, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: invalidateStore,
  });

  function toggleDay(day: number) {
    if (!storeSettings) return;
    const newDays = storeSettings.openDays.includes(day)
      ? storeSettings.openDays.filter((d) => d !== day)
      : [...storeSettings.openDays, day].sort();
    updateSettingsMutation.mutate({ openDays: newDays });
  }

  // Derive current mode from settings
  const storeMode: StoreMode = storeSettings?.forceClose
    ? 'force_close'
    : storeSettings?.forceOpen
      ? 'force_open'
      : 'schedule';

  const stats = [
    {
      title: 'Pedidos Hoje',
      value: data?.todayOrdersCount ?? 0,
      icon: ShoppingCart,
      bgColor: 'bg-[#6B3E14]/10',
      color: 'text-[#6B3E14]',
    },
    {
      title: 'Receita Hoje',
      value: formatCurrency(data?.todayRevenue ?? 0),
      icon: DollarSign,
      bgColor: 'bg-emerald-500/10',
      color: 'text-emerald-600',
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(data?.avgTicket ?? 0),
      icon: Receipt,
      bgColor: 'bg-blue-500/10',
      color: 'text-blue-600',
    },
    {
      title: 'Em Preparo',
      value: data?.ordersByStatus?.preparing ?? 0,
      icon: ChefHat,
      bgColor: 'bg-amber-500/10',
      color: 'text-amber-600',
    },
  ];

  return {
    data,
    stats,
    storeSettings,
    storeStatus,
    storeMode,
    setStoreModeMutation,
    updateSettingsMutation,
    toggleDay,
  };
}
