'use client';

import { useState } from 'react';
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
export type DashboardRange = {
  from: string;
  to: string;
};

export function useDashboardPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [range, setRange] = useState<DashboardRange>(() => createDefaultRange());

  const { data } = useQuery<Dashboard>({
    queryKey: ['admin-dashboard', range.from, range.to],
    queryFn: () => adminFetch(`/api/admin/dashboard?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, token),
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
    queryClient.invalidateQueries({ queryKey: ['menu'] });
    queryClient.invalidateQueries({ queryKey: ['sections'] });
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
      title: 'Pedidos no período',
      value: data?.todayOrdersCount ?? 0,
      icon: ShoppingCart,
      bgColor: 'bg-[#A0603A]/10',
      color: 'text-[#A0603A]',
    },
    {
      title: 'Receita no período',
      value: formatCurrency(data?.todayRevenue ?? 0),
      icon: DollarSign,
      bgColor: 'bg-emerald-500/10',
      color: 'text-emerald-600',
    },
    {
      title: 'Ticket médio',
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
    range,
    setRange,
    resetRange: () => setRange(createDefaultRange()),
    setLast7DaysRange: () => setRange(createRelativeRange(6)),
    setLast30DaysRange: () => setRange(createRelativeRange(29)),
    setTodayRange: () => setRange(createRelativeRange(0)),
  };
}

function createDefaultRange(): DashboardRange {
  return createRelativeRange(6);
}

function createRelativeRange(daysBack: number): DashboardRange {
  const now = new Date();
  const to = formatInputDate(now);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - daysBack);
  const from = formatInputDate(fromDate);

  return { from, to };
}

function formatInputDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}
