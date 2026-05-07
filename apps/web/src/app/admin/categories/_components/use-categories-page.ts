'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { arrayMove } from '@dnd-kit/sortable';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import type { AdminCategory, AdminProduct } from '@/types/admin';
import type { WeeklySchedule } from '@cardapio/shared';

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; category: AdminCategory };

type ReorderDialogState = { categoryId: string; categoryName: string } | null;

export function useCategoriesPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const [form, setForm] = useState<{ name: string; description: string; sortOrder: number; availabilitySchedule: WeeklySchedule | null }>({
    name: '',
    description: '',
    sortOrder: 0,
    availabilitySchedule: null,
  });
  const [reorderDialog, setReorderDialog] = useState<ReorderDialogState>(null);

  const { data: categories, isLoading } = useQuery<AdminCategory[]>({
    queryKey: ['admin-categories'],
    queryFn: () => adminFetch('/api/admin/categories', token),
  });

  const { data: allProducts } = useQuery<AdminProduct[]>({
    queryKey: ['admin-products'],
    queryFn: () => adminFetch('/api/admin/products', token),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (dialog.mode === 'edit') {
        return adminFetch(`/api/admin/categories/${dialog.category.id}`, token, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      return adminFetch('/api/admin/categories', token, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setDialog({ mode: 'closed' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/categories/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminFetch(`/api/admin/categories/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      adminFetch('/api/admin/categories/reorder', token, {
        method: 'PATCH',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });

  const reorderProductsMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      adminFetch('/api/admin/products/reorder', token, {
        method: 'PATCH',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  function handleCategoryReorder(activeId: string, overId: string) {
    if (!categories || activeId === overId) return;

    const oldIndex = categories.findIndex((c) => c.id === activeId);
    const newIndex = categories.findIndex((c) => c.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    const items = reordered.map((c, i) => ({ id: c.id, sortOrder: i }));

    // Optimistic update
    queryClient.setQueryData<AdminCategory[]>(['admin-categories'], () =>
      reordered.map((c, i) => ({ ...c, sortOrder: i })),
    );

    reorderCategoriesMutation.mutate(items);
  }

  const categoryProducts = reorderDialog && allProducts
    ? allProducts
        .filter((p) => p.categoryId === reorderDialog.categoryId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    : [];

  function openCreate() {
    setForm({ name: '', description: '', sortOrder: 0, availabilitySchedule: null });
    setDialog({ mode: 'create' });
  }

  function openEdit(cat: AdminCategory) {
    setForm({ name: cat.name, description: cat.description || '', sortOrder: cat.sortOrder, availabilitySchedule: cat.availabilitySchedule ?? null });
    setDialog({ mode: 'edit', category: cat });
  }

  function closeDialog() {
    setDialog({ mode: 'closed' });
  }

  function handleSave() {
    saveMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      sortOrder: form.sortOrder,
      availabilitySchedule: form.availabilitySchedule,
    });
  }

  const dialogOpen = dialog.mode !== 'closed';
  const isEditing = dialog.mode === 'edit';

  return {
    categories,
    isLoading,
    dialogOpen,
    isEditing,
    form,
    setForm,
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    deleteMutation,
    toggleActiveMutation,
    saveMutation,
    setDialogOpen: (open: boolean) => { if (!open) closeDialog(); },
    handleCategoryReorder,
    reorderDialog,
    setReorderDialog,
    categoryProducts,
    reorderProductsMutation,
  };
}
