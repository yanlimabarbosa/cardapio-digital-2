'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import type { AdminProduct } from '@/types/admin';
import type { WeeklySchedule } from '@cardapio/shared';

interface AdminSection {
  id: string;
  label: string;
  emoji: string;
  sortOrder: number;
  isActive: boolean;
  availabilitySchedule?: WeeklySchedule | null;
  productCount: number;
  products: Array<{ id: string; name: string; price: number; imageUrl?: string }>;
}

export function useFeaturedPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<AdminSection | null>(null);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [managingProducts, setManagingProducts] = useState<AdminSection | null>(null);

  const { data: sections, isLoading: sectionsLoading } = useQuery<AdminSection[]>({
    queryKey: ['admin-sections'],
    queryFn: () => adminFetch('/api/admin/sections', token),
  });

  const { data: allProducts, isLoading: productsLoading } = useQuery<AdminProduct[]>({
    queryKey: ['admin-products'],
    queryFn: () => adminFetch('/api/admin/products', token),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { label: string; emoji?: string; availabilitySchedule?: WeeklySchedule | null }) =>
      adminFetch('/api/admin/sections', token, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setShowSectionDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...dto }: { id: string; label?: string; emoji?: string; isActive?: boolean; availabilitySchedule?: WeeklySchedule | null }) =>
      adminFetch(`/api/admin/sections/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setShowSectionDialog(false);
      setEditingSection(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/sections/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      adminFetch('/api/admin/sections/reorder', token, {
        method: 'PATCH',
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });

  const setProductsMutation = useMutation({
    mutationFn: ({ sectionId, productIds }: { sectionId: string; productIds: string[] }) =>
      adminFetch(`/api/admin/sections/${sectionId}/products`, token, {
        method: 'PUT',
        body: JSON.stringify({ productIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setManagingProducts(null);
    },
  });

  function openCreateSection() {
    setEditingSection(null);
    setShowSectionDialog(true);
  }

  function openEditSection(section: AdminSection) {
    setEditingSection(section);
    setShowSectionDialog(true);
  }

  const availableProducts = (allProducts ?? []).filter((p) => p.isActive && p.imageUrl);

  return {
    sections: sections ?? [],
    sectionsLoading,
    availableProducts,
    productsLoading,
    showSectionDialog,
    setShowSectionDialog,
    editingSection,
    openCreateSection,
    openEditSection,
    managingProducts,
    setManagingProducts,
    createMutation,
    updateMutation,
    deleteMutation,
    reorderMutation,
    setProductsMutation,
  };
}
