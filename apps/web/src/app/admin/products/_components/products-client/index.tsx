'use client';

import { useState, type ReactNode } from 'react';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import { Plus, Pencil, Loader2, ChevronDown, ImagePlus, Search, Eye, EyeOff, Trash2, CircleSlash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { useProductsPage } from '../use-products-page';
import type { AdminCombinedLimit } from '@/types/admin';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ProductDialog } from './product-dialog';
import { ExtraDialog } from './extra-dialog';
import { OptionGroupDialog } from './option-group-dialog';
import { SortableOptionGroupRow } from './sortable-option-group-row';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 24, stiffness: 300 } },
};

type DeleteTarget =
  | { type: 'product'; id: string; name: string }
  | { type: 'optionGroup'; id: string; name: string }
  | { type: 'groupOption'; id: string; name: string }
  | { type: 'combinedLimit'; id: string; name: string }
  | { type: 'extra'; id: string; name: string }
  | null;

type ChipTone = 'neutral' | 'required' | 'optional' | 'choice' | 'count' | 'hidden' | 'soldOut';

function DetailChip({ tone = 'neutral', children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-bold leading-none',
        tone === 'required' && 'bg-[#FFF7ED] text-[#A0603A] ring-1 ring-[#E3D1BF]',
        tone === 'optional' && 'bg-white text-[#7A624C] ring-1 ring-[#E3D1BF]',
        tone === 'choice' && 'bg-white text-[#7A624C] ring-1 ring-[#E3D1BF]',
        tone === 'count' && 'bg-[#F8F1EA] text-[#7A624C] ring-1 ring-[#E3D1BF]',
        tone === 'hidden' && 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
        tone === 'soldOut' && 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        tone === 'neutral' && 'bg-white text-slate-600 ring-1 ring-slate-200',
      )}
    >
      {children}
    </span>
  );
}

const actionIconButtonBaseClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-[#7A624C] transition-colors hover:border-[#E8DDD0] hover:bg-[#FFFCF8] hover:text-[#3D2B1F]';

function ActionIconButton({
  label,
  children,
  onClick,
  className,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          actionIconButtonBaseClass,
          className,
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

type ProductsPage = ReturnType<typeof useProductsPage>;

function CombinedLimitsSection({
  productId,
  limits,
  createMutation,
  updateMutation,
  onRequestDelete,
}: {
  productId: string;
  limits: AdminCombinedLimit[];
  createMutation: ProductsPage['createCombinedLimitMutation'];
  updateMutation: ProductsPage['updateCombinedLimitMutation'];
  onRequestDelete: (limit: { id: string; name: string }) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newMax, setNewMax] = useState('1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMax, setEditMax] = useState('1');

  function startEdit(limit: AdminCombinedLimit) {
    setEditingId(limit.id);
    setEditName(limit.name);
    setEditMax(String(limit.maxSelections));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(
      { productId, data: { name, maxSelections: parseInt(newMax, 10) || 1 } },
      {
        onSuccess: () => {
          setNewName('');
          setNewMax('1');
        },
      },
    );
  }

  function handleUpdate() {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    updateMutation.mutate(
      { id: editingId, data: { name, maxSelections: parseInt(editMax, 10) || 1 } },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">
          Limites combinados
        </span>
      </div>

      {limits.length === 0 ? (
        <p className="text-xs text-[#8B7355]">Nenhum limite combinado</p>
      ) : (
        <div className="space-y-2">
          {limits.map((limit) => (
            <div
              key={limit.id}
              data-testid={`combined-limit-${limit.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#E8DDD0] bg-white px-3 py-2"
            >
              {editingId === limit.id ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nome do limite"
                    className="h-9 min-w-[10rem] flex-1 rounded-lg border-[#E8DDD0] bg-[#FFFCF8]"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={editMax}
                    onChange={(e) => setEditMax(e.target.value)}
                    className="h-9 w-20 rounded-lg border-[#E8DDD0] bg-[#FFFCF8]"
                  />
                  <button
                    onClick={handleUpdate}
                    disabled={updateMutation.isPending}
                    className="flex h-9 items-center rounded-lg bg-[#A0603A] px-3 text-xs font-bold text-white transition-colors hover:bg-[#8b4c2a] disabled:opacity-60"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex h-9 items-center rounded-lg border border-[#E8DDD0] bg-white px-3 text-xs font-bold text-[#6F5A43] transition-colors hover:bg-[#FAF6F1]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold text-[#3D2B1F]">{limit.name}</span>
                    <DetailChip tone="count">máx {limit.maxSelections}</DetailChip>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ActionIconButton label="Editar limite" onClick={() => startEdit(limit)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </ActionIconButton>
                    <ActionIconButton
                      label="Excluir limite"
                      onClick={() => onRequestDelete({ id: limit.id, name: limit.name })}
                      className="hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ActionIconButton>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#E8DDD0] pt-3">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do limite"
          data-testid={`combined-limit-new-name-${productId}`}
          className="h-9 min-w-[10rem] flex-1 rounded-lg border-[#E8DDD0] bg-[#FFFCF8]"
        />
        <Input
          type="number"
          min={1}
          value={newMax}
          onChange={(e) => setNewMax(e.target.value)}
          data-testid={`combined-limit-new-max-${productId}`}
          className="h-9 w-20 rounded-lg border-[#E8DDD0] bg-[#FFFCF8]"
        />
        <button
          onClick={handleCreate}
          disabled={createMutation.isPending || !newName.trim()}
          data-testid={`combined-limit-add-${productId}`}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E8DDD0] bg-white px-3 text-xs font-bold text-[#6F5A43] transition-colors hover:bg-[#FAF6F1] hover:text-[#A0603A] disabled:opacity-60"
        >
          <Plus className="h-3 w-3" />
          Adicionar limite
        </button>
      </div>
    </div>
  );
}

export function ProductsClient() {
  const {
    products,
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
    updateProductStatusMutation,
    deleteProductMutation,
    setProductDialogOpen,
    extraDialogOpen,
    isEditingExtra,
    extraForm,
    setExtraForm,
    extraImagePreview,
    handleExtraImageSelect,
    clearExtraImage,
    extraUploading,
    openCreateExtra,
    openEditExtra,
    handleSaveExtra,
    deleteExtraMutation,
    updateExtraStatusMutation,
    saveExtraMutation,
    setExtraDialogOpen,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    // Option groups
    expandedGroup,
    toggleExpandedGroup,
    optionGroupDialogOpen,
    isEditingOptionGroup,
    optionGroupForm,
    setOptionGroupForm,
    openCreateOptionGroup,
    openEditOptionGroup,
    handleSaveOptionGroup,
    handleOptionGroupReorder,
    saveOptionGroupMutation,
    deleteOptionGroupMutation,
    updateOptionGroupStatusMutation,
    setOptionGroupDialogOpen,
    // Combined limits
    createCombinedLimitMutation,
    updateCombinedLimitMutation,
    deleteCombinedLimitMutation,
    setGroupCombinedLimit,
    // Group options
    groupOptionDialogOpen,
    isEditingGroupOption,
    groupOptionForm,
    setGroupOptionForm,
    groupOptionImagePreview,
    handleGroupOptionImageSelect,
    clearGroupOptionImage,
    groupOptionUploading,
    openCreateGroupOption,
    openEditGroupOption,
    handleSaveGroupOption,
    saveGroupOptionMutation,
    deleteGroupOptionMutation,
    updateGroupOptionStatusMutation,
    setGroupOptionDialogOpen,
  } = useProductsPage();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const groupSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const deletePending =
    deleteProductMutation.isPending ||
    deleteOptionGroupMutation.isPending ||
    deleteGroupOptionMutation.isPending ||
    deleteCombinedLimitMutation.isPending ||
    deleteExtraMutation.isPending;

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const options = { onSuccess: () => setDeleteTarget(null) };

    if (deleteTarget.type === 'product') {
      deleteProductMutation.mutate(deleteTarget.id, options);
    } else if (deleteTarget.type === 'optionGroup') {
      deleteOptionGroupMutation.mutate(deleteTarget.id, options);
    } else if (deleteTarget.type === 'groupOption') {
      deleteGroupOptionMutation.mutate(deleteTarget.id, options);
    } else if (deleteTarget.type === 'combinedLimit') {
      deleteCombinedLimitMutation.mutate(deleteTarget.id, options);
    } else {
      deleteExtraMutation.mutate(deleteTarget.id, options);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-[#3D2B1F]">Produtos</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#A0603A] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#8b4c2a]"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </motion.button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7355]" />
          <Input
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl border-[#E8DDD0] bg-[#FFFCF8] pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
              !categoryFilter
                ? 'bg-[#A0603A] text-white'
                : 'bg-[#FFFCF8] text-[#8B7355] border border-[#E8DDD0] hover:bg-[#FAF6F1]',
            )}
          >
            Todos
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(categoryFilter === cat.id ? '' : cat.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
                categoryFilter === cat.id
                  ? 'bg-[#A0603A] text-white'
                  : 'bg-[#FFFCF8] text-[#8B7355] border border-[#E8DDD0] hover:bg-[#FAF6F1]',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#A0603A]" />
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {products?.map((product) => (
            <motion.div
              key={product.id}
              data-testid={`product-${product.id}`}
              variants={itemVariants}
              className={cn(
                'overflow-hidden rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] shadow-[0_0_8px_rgba(61,43,31,0.12)]',
                'flex',
              )}
            >
              <div className={cn(
                'w-0.5 shrink-0',
                product.isActive ? (product.isSoldOut ? 'bg-amber-300' : 'bg-emerald-300') : 'bg-slate-300',
              )} />

              <div className="flex-1 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {product.imageUrl ? (
                      <img
                        src={getImageUrl(product.imageUrl) || ''}
                        alt={product.name}
                        className="h-14 w-14 shrink-0 rounded-xl border border-[#E8DDD0] object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#E8DDD0] bg-[#FAF6F1]">
                        <ImagePlus className="h-5 w-5 text-[#E8DDD0]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#3D2B1F] truncate">{product.name}</h3>
                        <span className="shrink-0 rounded-full bg-[#FAF6F1] px-2 py-0.5 text-xs font-semibold text-[#8B7355]">
                          {product.categoryName}
                        </span>
                        {product.isCompound && (
                          <span className="shrink-0 rounded-full bg-[#FAF6F1] px-2 py-0.5 text-xs font-semibold text-[#8B7355] ring-1 ring-[#E8DDD0]">
                            Composto
                          </span>
                        )}
                        {product.isSoldOut && (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Esgotado
                          </span>
                        )}
                        {!product.isActive && (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Oculto
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#8B7355]">
                        {formatCurrency(product.price)} · {product.isCompound ? `${product.optionGroups.length} grupos` : `${product.extras.length} extras`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 ml-2">
                    <Tooltip label={expandedProduct === product.id ? 'Recolher produto' : 'Expandir produto'}>
                      <button
                        onClick={() => toggleExpanded(product.id)}
                        aria-label={expandedProduct === product.id ? 'Recolher produto' : 'Expandir produto'}
                        className={actionIconButtonBaseClass}
                      >
                        <motion.div
                          animate={{ rotate: expandedProduct === product.id ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </motion.div>
                      </button>
                    </Tooltip>
                    <Tooltip label="Editar produto">
                      <button
                        onClick={() => openEdit(product)}
                        aria-label="Editar produto"
                        className={cn(actionIconButtonBaseClass, 'hover:text-[#A0603A]')}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip label={product.isSoldOut ? 'Marcar como disponível' : 'Marcar como esgotado'}>
                      <button
                        onClick={() => updateProductStatusMutation.mutate({ id: product.id, data: { isSoldOut: !product.isSoldOut } })}
                        aria-label={product.isSoldOut ? 'Marcar como disponível' : 'Marcar como esgotado'}
                        className={cn(
                          actionIconButtonBaseClass,
                          product.isSoldOut
                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700',
                        )}
                      >
                        <CircleSlash className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip label={product.isActive ? 'Ocultar do cardápio' : 'Mostrar no cardápio'}>
                      <button
                        onClick={() => toggleMutation.mutate(product.id)}
                        aria-label={product.isActive ? 'Ocultar do cardápio' : 'Mostrar no cardápio'}
                        className={cn(
                          actionIconButtonBaseClass,
                          product.isActive
                            ? 'text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50'
                            : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200',
                        )}
                      >
                        {product.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    </Tooltip>
                    <Tooltip label="Excluir">
                      <button
                        onClick={() => setDeleteTarget({ type: 'product', id: product.id, name: product.name })}
                        aria-label="Excluir"
                        className={cn(actionIconButtonBaseClass, 'hover:border-red-200 hover:bg-red-50 hover:text-red-600')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedProduct === product.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      {product.isCompound ? (
                        /* ─── Option Groups (compound product) ─── */
                        <div className="mt-4 rounded-2xl border border-[#E3D1BF] bg-[#F8F1EA] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">
                              Grupos de Opções
                            </span>
                            <button
                              onClick={() => openCreateOptionGroup(product.id)}
                              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E8DDD0] bg-white px-3 text-xs font-bold text-[#6F5A43] transition-colors hover:bg-[#FAF6F1] hover:text-[#A0603A]"
                            >
                              <Plus className="h-3 w-3" />
                              Novo grupo
                            </button>
                          </div>
                          <CombinedLimitsSection
                            productId={product.id}
                            limits={product.combinedLimits}
                            createMutation={createCombinedLimitMutation}
                            updateMutation={updateCombinedLimitMutation}
                            onRequestDelete={(limit) => setDeleteTarget({ type: 'combinedLimit', id: limit.id, name: limit.name })}
                          />
                          {product.optionGroups.length === 0 ? (
                            <p className="text-sm text-[#8B7355]">Nenhum grupo de opções criado</p>
                          ) : (
                            <DndContext
                              sensors={groupSensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(e: DragEndEvent) => {
                                const { active, over } = e;
                                if (!over || active.id === over.id) return;
                                const ids = product.optionGroups.map((g) => g.id);
                                const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
                                handleOptionGroupReorder(product.id, next);
                              }}
                            >
                              <SortableContext
                                items={product.optionGroups.map((g) => g.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2.5">
                              {product.optionGroups.map((group) => (
                                <SortableOptionGroupRow key={group.id} id={group.id}>
                                <div
                                  data-testid={`group-row-${group.id}`}
                                  className={cn(
                                    'group overflow-hidden rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] shadow-[0_3px_10px_rgba(61,43,31,0.04)] transition-colors',
                                    expandedGroup === group.id && 'border-[#D9C8B7] bg-[#FFF9F2]',
                                    !group.isActive && 'opacity-70',
                                  )}
                                >
                                  <div className={cn('flex items-center justify-between gap-3 px-3', expandedGroup === group.id ? 'py-2.5' : 'py-2')}>
                                    <Tooltip label={expandedGroup === group.id ? 'Recolher grupo' : 'Expandir grupo'} className="min-w-0 flex flex-1">
                                      <button
                                        onClick={() => toggleExpandedGroup(group.id)}
                                        aria-label={expandedGroup === group.id ? 'Recolher grupo' : 'Expandir grupo'}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                      >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E8DDD0] bg-[#FFFCF8] text-[#8B7355]">
                                          <motion.span animate={{ rotate: expandedGroup === group.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                            <ChevronDown className="h-4 w-4" />
                                          </motion.span>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-sm font-bold text-[#3D2B1F]">{group.name}</span>
                                            <DetailChip tone={group.minSelections >= 1 ? 'required' : 'optional'}>
                                              {group.minSelections >= 1 ? 'Obrigatório' : 'Opcional'}
                                            </DetailChip>
                                            <DetailChip tone="choice">{group.maxSelections === 1 ? 'Única escolha' : `Até ${group.maxSelections}`}</DetailChip>
                                            <DetailChip tone="count">{group.options.length} opções</DetailChip>
                                            {!group.isActive && <DetailChip tone="hidden">Oculto</DetailChip>}
                                          </span>
                                        </span>
                                      </button>
                                    </Tooltip>
                                    <div
                                      className={cn(
                                        'flex shrink-0 items-center gap-1.5 transition-opacity',
                                        expandedGroup !== group.id && 'opacity-60 group-hover:opacity-100 group-focus-within:opacity-100',
                                      )}
                                    >
                                      {expandedGroup === group.id && (
                                        <button
                                          onClick={() => openCreateGroupOption(group.id)}
                                          className="mr-1 flex h-8 items-center gap-1.5 rounded-lg border border-[#E8DDD0] bg-[#FFFCF8] px-3 text-[11px] font-bold text-[#6F5A43] transition-colors hover:bg-white hover:text-[#A0603A]"
                                        >
                                          <Plus className="h-3 w-3" />
                                          Adicionar opção
                                        </button>
                                      )}
                                      <ActionIconButton label="Editar grupo" onClick={() => openEditOptionGroup(group)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </ActionIconButton>
                                      <ActionIconButton
                                        label={group.isActive ? 'Ocultar grupo' : 'Mostrar grupo'}
                                        onClick={() => updateOptionGroupStatusMutation.mutate({ id: group.id, data: { isActive: !group.isActive } })}
                                        className={group.isActive ? 'text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                      >
                                        {group.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                      </ActionIconButton>
                                      <ActionIconButton
                                        label="Excluir grupo"
                                        onClick={() => setDeleteTarget({ type: 'optionGroup', id: group.id, name: group.name })}
                                        className="hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </ActionIconButton>
                                    </div>
                                  </div>
                                  <AnimatePresence>
                                    {expandedGroup === group.id && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="border-t border-[#E8DDD0] bg-[#F6EEE5] p-3">
                                          <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">
                                              Limite combinado
                                            </label>
                                            <select
                                              data-testid={`group-combined-select-${group.id}`}
                                              value={group.combinedLimitId ?? ''}
                                              onChange={(e) => setGroupCombinedLimit(group.id, e.target.value || null)}
                                              className="h-9 rounded-lg border border-[#E8DDD0] bg-[#FFFCF8] px-2 text-sm text-[#3D2B1F]"
                                            >
                                              <option value="">Nenhum</option>
                                              {product.combinedLimits.map((limit) => (
                                                <option key={limit.id} value={limit.id}>
                                                  {limit.name} (máx {limit.maxSelections})
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                          {group.options.length === 0 ? (
                                            <p className="text-xs text-[#8B7355]">Nenhuma opção</p>
                                          ) : (
                                            <div className="grid gap-2 xl:grid-cols-2">
                                              {group.options.map((opt) => {
                                                const optImageSrc = getImageUrl(opt.imageUrl);
                                                return (
                                                  <div
                                                    key={opt.id}
                                                    className={cn(
                                                      'group/option flex min-h-[54px] items-center justify-between gap-3 rounded-lg border border-[#E8DDD0] bg-[#FFFCF8] px-3 py-2 text-sm shadow-[0_2px_8px_rgba(61,43,31,0.04)] transition-colors hover:border-[#D9C8B7] hover:bg-white',
                                                      (!opt.isActive || opt.isSoldOut) && 'bg-[#FFFCF8]/75',
                                                    )}
                                                  >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                      {optImageSrc && (
                                                        <img
                                                          src={optImageSrc}
                                                          alt={opt.name}
                                                          className="h-10 w-10 shrink-0 rounded-lg border border-[#E8DDD0] object-cover"
                                                        />
                                                      )}
                                                      <div className="min-w-0">
                                                        <div className="truncate font-semibold text-[#3D2B1F]">{opt.name}</div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                          <span className="text-xs font-bold text-[#8B7355]">
                                                            {opt.price > 0 ? formatCurrency(opt.price) : 'Incluso'}
                                                          </span>
                                                          {opt.isSoldOut && <DetailChip tone="soldOut">Esgotado</DetailChip>}
                                                          {!opt.isActive && <DetailChip tone="hidden">Oculto</DetailChip>}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1 transition-opacity lg:opacity-65 lg:group-hover/option:opacity-100 lg:group-focus-within/option:opacity-100">
                                                      <ActionIconButton label="Editar opção" onClick={() => openEditGroupOption(opt)}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                      </ActionIconButton>
                                                      <ActionIconButton
                                                        label={opt.isSoldOut ? 'Marcar opção disponível' : 'Marcar opção esgotada'}
                                                        onClick={() => updateGroupOptionStatusMutation.mutate({ id: opt.id, data: { isSoldOut: !opt.isSoldOut } })}
                                                        className={opt.isSoldOut ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700'}
                                                      >
                                                        <CircleSlash className="h-3.5 w-3.5" />
                                                      </ActionIconButton>
                                                      <ActionIconButton
                                                        label={opt.isActive ? 'Ocultar opção' : 'Mostrar opção'}
                                                        onClick={() => updateGroupOptionStatusMutation.mutate({ id: opt.id, data: { isActive: !opt.isActive } })}
                                                        className={opt.isActive ? 'text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                                      >
                                                        {opt.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                                      </ActionIconButton>
                                                      <ActionIconButton
                                                        label="Excluir opção"
                                                        onClick={() => setDeleteTarget({ type: 'groupOption', id: opt.id, name: opt.name })}
                                                        className="hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                                      >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                      </ActionIconButton>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                                </SortableOptionGroupRow>
                              ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                        </div>
                      ) : (
                        /* ─── Flat Extras (non-compound) ─── */
                        <div className="mt-4 rounded-2xl border border-[#E3D1BF] bg-[#F8F1EA] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">
                              Adicionais
                            </span>
                            <button
                              onClick={() => openCreateExtra(product.id)}
                              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E8DDD0] bg-white px-3 text-xs font-bold text-[#6F5A43] transition-colors hover:bg-[#FAF6F1] hover:text-[#A0603A]"
                            >
                              <Plus className="h-3 w-3" />
                              Novo adicional
                            </button>
                          </div>
                          {product.extras.length === 0 ? (
                            <p className="text-sm text-[#8B7355]">Sem adicionais</p>
                          ) : (
                            <div className="space-y-2">
                              {product.extras.map((extra) => {
                                const extraImageSrc = getImageUrl(extra.imageUrl);
                                return (
                                  <div
                                    key={extra.id}
                                    className={cn(
                                      'flex items-center justify-between gap-3 rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] px-3 py-2.5 text-sm shadow-[0_2px_8px_rgba(61,43,31,0.04)] transition-colors hover:border-[#D9C8B7] hover:bg-white',
                                      (!extra.isActive || extra.isSoldOut) && 'bg-[#FFFCF8]/75',
                                    )}
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      {extraImageSrc && (
                                        <img
                                          src={extraImageSrc}
                                          alt={extra.name}
                                          className="h-10 w-10 shrink-0 rounded-lg border border-[#E8DDD0] object-cover"
                                        />
                                      )}
                                      <div className="min-w-0">
                                        <div className="truncate font-semibold text-[#3D2B1F]">{extra.name}</div>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                          <span className="text-xs font-bold text-[#8B7355]">{formatCurrency(extra.price)}</span>
                                          {extra.isSoldOut && <DetailChip tone="soldOut">Esgotado</DetailChip>}
                                          {!extra.isActive && <DetailChip tone="hidden">Oculto</DetailChip>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      <ActionIconButton label="Editar adicional" onClick={() => openEditExtra(extra)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </ActionIconButton>
                                      <ActionIconButton
                                        label={extra.isSoldOut ? 'Marcar adicional disponível' : 'Marcar adicional esgotado'}
                                        onClick={() => updateExtraStatusMutation.mutate({ id: extra.id, data: { isSoldOut: !extra.isSoldOut } })}
                                        className={extra.isSoldOut ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700'}
                                      >
                                        <CircleSlash className="h-3.5 w-3.5" />
                                      </ActionIconButton>
                                      <ActionIconButton
                                        label={extra.isActive ? 'Ocultar adicional' : 'Mostrar adicional'}
                                        onClick={() => updateExtraStatusMutation.mutate({ id: extra.id, data: { isActive: !extra.isActive } })}
                                        className={extra.isActive ? 'text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                      >
                                        {extra.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                      </ActionIconButton>
                                      <ActionIconButton
                                        label="Excluir adicional"
                                        onClick={() => setDeleteTarget({ type: 'extra', id: extra.id, name: extra.name })}
                                        className="hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </ActionIconButton>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        isEditing={isEditing}
        form={form}
        setForm={setForm}
        categories={categories}
        imagePreview={imagePreview}
        onImageSelect={handleImageSelect}
        onClearImage={clearImage}
        onSave={handleSave}
        isPending={saveMutation.isPending}
        uploading={uploading}
      />

      <ExtraDialog
        open={extraDialogOpen}
        onOpenChange={setExtraDialogOpen}
        isEditing={isEditingExtra}
        form={extraForm}
        setForm={setExtraForm}
        imagePreview={extraImagePreview}
        onImageSelect={handleExtraImageSelect}
        onClearImage={clearExtraImage}
        onSave={handleSaveExtra}
        isPending={saveExtraMutation.isPending}
        uploading={extraUploading}
      />

      <OptionGroupDialog
        open={optionGroupDialogOpen}
        onOpenChange={setOptionGroupDialogOpen}
        isEditing={isEditingOptionGroup}
        form={optionGroupForm}
        setForm={setOptionGroupForm}
        onSave={handleSaveOptionGroup}
        isPending={saveOptionGroupMutation.isPending}
      />

      <ExtraDialog
        open={groupOptionDialogOpen}
        onOpenChange={setGroupOptionDialogOpen}
        isEditing={isEditingGroupOption}
        label="Opção"
        form={groupOptionForm}
        setForm={setGroupOptionForm}
        imagePreview={groupOptionImagePreview}
        onImageSelect={handleGroupOptionImageSelect}
        onClearImage={clearGroupOptionImage}
        onSave={handleSaveGroupOption}
        isPending={saveGroupOptionMutation.isPending}
        uploading={groupOptionUploading}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open && !deletePending) setDeleteTarget(null); }}
        title="Excluir item?"
        description={
          deleteTarget
            ? `Voce esta prestes a excluir "${deleteTarget.name}". Essa acao nao pode ser desfeita.`
            : ''
        }
        isPending={deletePending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
