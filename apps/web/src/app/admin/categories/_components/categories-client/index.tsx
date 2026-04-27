'use client';

import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { useCategoriesPage } from '../use-categories-page';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { SortableCategoryCard } from './sortable-category-card';
import { ProductReorderDialog } from './product-reorder-dialog';

export function CategoriesClient() {
  const {
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
    setDialogOpen,
    handleCategoryReorder,
    reorderDialog,
    setReorderDialog,
    categoryProducts,
    reorderProductsMutation,
  } = useCategoriesPage();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    handleCategoryReorder(active.id as string, over.id as string);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-[#2A1508]">Categorias</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#6B3E14] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5C2F10]"
        >
          <Plus className="h-4 w-4" />
          Nova Categoria
        </motion.button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#6B3E14]" />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoryDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
          <SortableContext
            items={categories?.map((c) => c.id) ?? []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {categories?.map((cat) => (
                <SortableCategoryCard
                  key={cat.id}
                  cat={cat}
                  onEdit={() => openEdit(cat)}
                  onToggleActive={() =>
                    toggleActiveMutation.mutate({ id: cat.id, isActive: !cat.isActive })
                  }
                  onReorderProducts={() =>
                    setReorderDialog({ categoryId: cat.id, categoryName: cat.name })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          open={dialogOpen}
          className="border-[#EAD8A0] bg-[#FBF6E9]"
        >
          <DialogHeader className="border-b border-[#EAD8A0] pb-4 px-6 pt-6">
            <DialogTitle className="font-display text-lg font-semibold text-[#2A1508]">
              {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">
                Nome
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">
                Descrição
              </label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-11 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">
                Ordem
              </label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="h-11 w-24 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-[#EAD8A0] px-6 py-4">
            <button
              onClick={closeDialog}
              className="rounded-xl border border-[#EAD8A0] px-4 py-2.5 text-sm font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending || !form.name}
              className="rounded-xl bg-[#6B3E14] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5C2F10] disabled:opacity-60"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductReorderDialog
        open={reorderDialog !== null}
        categoryName={reorderDialog?.categoryName ?? ''}
        initialProducts={categoryProducts}
        isPending={reorderProductsMutation.isPending}
        onSave={(items) => {
          reorderProductsMutation.mutate(items, {
            onSuccess: () => setReorderDialog(null),
          });
        }}
        onClose={() => setReorderDialog(null)}
      />
    </div>
  );
}
