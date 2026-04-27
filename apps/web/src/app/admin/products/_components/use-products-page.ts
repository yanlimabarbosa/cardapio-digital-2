'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch, adminUpload, getImageUrl } from '@/lib/admin-api';
import type { AdminProduct, AdminCategoryOption, AdminExtra, AdminOptionGroup, AdminOptionGroupOption } from '@/types/admin';

type ProductDialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; product: AdminProduct };

type ExtraDialogState =
  | { mode: 'closed' }
  | { mode: 'create'; productId: string }
  | { mode: 'edit'; extra: AdminExtra };

type OptionGroupDialogState =
  | { mode: 'closed' }
  | { mode: 'create'; productId: string }
  | { mode: 'edit'; group: AdminOptionGroup };

type GroupOptionDialogState =
  | { mode: 'closed' }
  | { mode: 'create'; groupId: string }
  | { mode: 'edit'; option: AdminOptionGroupOption };

export function useProductsPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const [productDialog, setProductDialog] = useState<ProductDialogState>({ mode: 'closed' });
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    isCompound: false,
    isRedeemable: false,
    redemptionCost: '0',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [extraDialog, setExtraDialog] = useState<ExtraDialogState>({ mode: 'closed' });
  const [extraForm, setExtraForm] = useState({ name: '', price: '' });

  const [optionGroupDialog, setOptionGroupDialog] = useState<OptionGroupDialogState>({ mode: 'closed' });
  const [optionGroupForm, setOptionGroupForm] = useState({ name: '', minSelections: '0', maxSelections: '1' });
  const [groupOptionDialog, setGroupOptionDialog] = useState<GroupOptionDialogState>({ mode: 'closed' });
  const [groupOptionForm, setGroupOptionForm] = useState({ name: '', price: '' });
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: products, isLoading } = useQuery<AdminProduct[]>({
    queryKey: ['admin-products'],
    queryFn: () => adminFetch('/api/admin/products', token),
  });

  const { data: categories } = useQuery<AdminCategoryOption[]>({
    queryKey: ['admin-categories'],
    queryFn: () => adminFetch('/api/admin/categories', token),
  });

  const filteredProducts = useMemo(() => {
    if (!products) return undefined;
    let result = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q),
      );
    }
    if (categoryFilter) {
      result = result.filter((p) => p.categoryId === categoryFilter);
    }
    return result;
  }, [products, searchQuery, categoryFilter]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (productDialog.mode === 'edit') {
        return adminFetch(`/api/admin/products/${productDialog.product.id}`, token, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      return adminFetch('/api/admin/products', token, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setProductDialog({ mode: 'closed' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/products/${id}/toggle`, token, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const saveExtraMutation = useMutation({
    mutationFn: (data: any) => {
      if (extraDialog.mode === 'edit') {
        return adminFetch(`/api/admin/extras/${extraDialog.extra.id}`, token, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      if (extraDialog.mode === 'create') {
        return adminFetch(`/api/admin/products/${extraDialog.productId}/extras`, token, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      return Promise.reject(new Error('Invalid state'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setExtraDialog({ mode: 'closed' });
    },
  });

  const deleteExtraMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/extras/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  // ─── Option Group mutations ──────────────────────────

  const saveOptionGroupMutation = useMutation({
    mutationFn: (data: any) => {
      if (optionGroupDialog.mode === 'edit') {
        return adminFetch(`/api/admin/option-groups/${optionGroupDialog.group.id}`, token, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      if (optionGroupDialog.mode === 'create') {
        return adminFetch(`/api/admin/products/${optionGroupDialog.productId}/option-groups`, token, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      return Promise.reject(new Error('Invalid state'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setOptionGroupDialog({ mode: 'closed' });
    },
  });

  const deleteOptionGroupMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/option-groups/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const saveGroupOptionMutation = useMutation({
    mutationFn: (data: any) => {
      if (groupOptionDialog.mode === 'edit') {
        return adminFetch(`/api/admin/option-group-options/${groupOptionDialog.option.id}`, token, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      if (groupOptionDialog.mode === 'create') {
        return adminFetch(`/api/admin/option-groups/${groupOptionDialog.groupId}/options`, token, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      return Promise.reject(new Error('Invalid state'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setGroupOptionDialog({ mode: 'closed' });
    },
  });

  const deleteGroupOptionMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/option-group-options/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  function openCreateOptionGroup(productId: string) {
    setOptionGroupForm({ name: '', minSelections: '0', maxSelections: '1' });
    setOptionGroupDialog({ mode: 'create', productId });
  }

  function openEditOptionGroup(group: AdminOptionGroup) {
    setOptionGroupForm({ name: group.name, minSelections: String(group.minSelections), maxSelections: String(group.maxSelections) });
    setOptionGroupDialog({ mode: 'edit', group });
  }

  function handleSaveOptionGroup() {
    saveOptionGroupMutation.mutate({
      name: optionGroupForm.name,
      minSelections: parseInt(optionGroupForm.minSelections, 10) || 0,
      maxSelections: parseInt(optionGroupForm.maxSelections, 10) || 1,
    });
  }

  function openCreateGroupOption(groupId: string) {
    setGroupOptionForm({ name: '', price: '' });
    setGroupOptionDialog({ mode: 'create', groupId });
  }

  function openEditGroupOption(option: AdminOptionGroupOption) {
    setGroupOptionForm({ name: option.name, price: String(option.price) });
    setGroupOptionDialog({ mode: 'edit', option });
  }

  function handleSaveGroupOption() {
    saveGroupOptionMutation.mutate({
      name: groupOptionForm.name,
      price: parseFloat(groupOptionForm.price),
    });
  }

  function toggleExpandedGroup(groupId: string) {
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  }

  function openCreate() {
    setForm({ name: '', description: '', price: '', categoryId: categories?.[0]?.id || '', imageUrl: '', isCompound: false, isRedeemable: false, redemptionCost: '0' });
    setImageFile(null);
    setImagePreview(null);
    setProductDialog({ mode: 'create' });
  }

  function openEdit(product: AdminProduct) {
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      categoryId: product.categoryId,
      imageUrl: product.imageUrl || '',
      isCompound: product.isCompound ?? false,
      isRedeemable: (product as any).isRedeemable ?? false,
      redemptionCost: String((product as any).redemptionCost ?? 0),
    });
    setImageFile(null);
    setImagePreview(product.imageUrl ? getImageUrl(product.imageUrl) : null);
    setProductDialog({ mode: 'edit', product });
  }

  async function handleSave() {
    let imageUrl = form.imageUrl || undefined;

    if (imageFile) {
      setUploading(true);
      try {
        const result = await adminUpload(imageFile, token);
        imageUrl = result.url;
      } catch {
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    saveMutation.mutate({
      name: form.name,
      price: parseFloat(form.price),
      categoryId: form.categoryId,
      description: form.description || undefined,
      imageUrl,
      isCompound: form.isCompound,
      isRedeemable: form.isRedeemable,
      redemptionCost: form.isRedeemable ? parseInt(form.redemptionCost, 10) || 0 : 0,
    });
  }

  function openCreateExtra(productId: string) {
    setExtraForm({ name: '', price: '' });
    setExtraDialog({ mode: 'create', productId });
  }

  function openEditExtra(extra: AdminExtra) {
    setExtraForm({ name: extra.name, price: String(extra.price) });
    setExtraDialog({ mode: 'edit', extra });
  }

  function handleSaveExtra() {
    saveExtraMutation.mutate({
      name: extraForm.name,
      price: parseFloat(extraForm.price),
    });
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setForm({ ...form, imageUrl: '' });
  }

  function toggleExpanded(productId: string) {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  }

  const productDialogOpen = productDialog.mode !== 'closed';
  const isEditing = productDialog.mode === 'edit';
  const extraDialogOpen = extraDialog.mode !== 'closed';
  const isEditingExtra = extraDialog.mode === 'edit';

  return {
    products: filteredProducts,
    isLoading,
    categories,
    expandedProduct,
    toggleExpanded,
    productDialogOpen,
    isEditing,
    form,
    setForm,
    imagePreview,
    openCreate,
    openEdit,
    handleSave,
    handleImageSelect,
    clearImage,
    saveMutation,
    uploading,
    toggleMutation,
    setProductDialogOpen: (open: boolean) => { if (!open) setProductDialog({ mode: 'closed' }); },
    extraDialogOpen,
    isEditingExtra,
    extraForm,
    setExtraForm,
    openCreateExtra,
    openEditExtra,
    handleSaveExtra,
    deleteExtraMutation,
    saveExtraMutation,
    setExtraDialogOpen: (open: boolean) => { if (!open) setExtraDialog({ mode: 'closed' }); },
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    // Option groups
    expandedGroup,
    toggleExpandedGroup,
    optionGroupDialogOpen: optionGroupDialog.mode !== 'closed',
    isEditingOptionGroup: optionGroupDialog.mode === 'edit',
    optionGroupForm,
    setOptionGroupForm,
    openCreateOptionGroup,
    openEditOptionGroup,
    handleSaveOptionGroup,
    saveOptionGroupMutation,
    deleteOptionGroupMutation,
    setOptionGroupDialogOpen: (open: boolean) => { if (!open) setOptionGroupDialog({ mode: 'closed' }); },
    // Group options
    groupOptionDialogOpen: groupOptionDialog.mode !== 'closed',
    isEditingGroupOption: groupOptionDialog.mode === 'edit',
    groupOptionForm,
    setGroupOptionForm,
    openCreateGroupOption,
    openEditGroupOption,
    handleSaveGroupOption,
    saveGroupOptionMutation,
    deleteGroupOptionMutation,
    setGroupOptionDialogOpen: (open: boolean) => { if (!open) setGroupOptionDialog({ mode: 'closed' }); },
  };
}
