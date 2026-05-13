'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import { normalizeNeighborhood, type DeliveryAreaResponse } from '@cardapio/shared';

export function useDeliveryAreasPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingArea, setEditingArea] = useState<DeliveryAreaResponse | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const { data: areas, isLoading } = useQuery<DeliveryAreaResponse[]>({
    queryKey: ['admin-delivery-areas'],
    queryFn: () => adminFetch('/api/admin/delivery-areas', token),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { neighborhood: string; city: string; fee: number }) =>
      adminFetch('/api/admin/delivery-areas', token, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-areas'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-areas'] });
      setShowDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...dto }: { id: string; neighborhood?: string; city?: string; fee?: number; isActive?: boolean }) =>
      adminFetch(`/api/admin/delivery-areas/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-areas'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-areas'] });
      setShowDialog(false);
      setEditingArea(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/delivery-areas/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-areas'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-areas'] });
    },
  });

  const filtered = (areas ?? []).filter((a) => {
    if (!search) return true;
    const q = normalizeNeighborhood(search);
    return (
      normalizeNeighborhood(a.neighborhood).includes(q) ||
      normalizeNeighborhood(a.city).includes(q)
    );
  });

  function openCreate() {
    setEditingArea(null);
    setShowDialog(true);
  }

  function openEdit(area: DeliveryAreaResponse) {
    setEditingArea(area);
    setShowDialog(true);
  }

  function toggleActive(area: DeliveryAreaResponse) {
    updateMutation.mutate({ id: area.id, isActive: !area.isActive });
  }

  return {
    areas: filtered,
    isLoading,
    search,
    setSearch,
    showDialog,
    setShowDialog,
    editingArea,
    openCreate,
    openEdit,
    toggleActive,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
