'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  arrayMove,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import type { AdminProduct } from '@/types/admin';
import { SortableProductItem } from './sortable-product-item';

interface ProductReorderDialogProps {
  open: boolean;
  categoryName: string;
  initialProducts: AdminProduct[];
  isPending: boolean;
  onSave: (items: { id: string; sortOrder: number }[]) => void;
  onClose: () => void;
}

export function ProductReorderDialog({
  open,
  categoryName,
  initialProducts,
  isPending,
  onSave,
  onClose,
}: ProductReorderDialogProps) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Sync local state when dialog opens with new products
  if (open && !initialized) {
    setProducts(initialProducts);
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setProducts((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === (over.id as string));
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSave() {
    const items = products.map((p, i) => ({ id: p.id, sortOrder: i }));
    onSave(items);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent open={open} className="border-[#EAD8A0] bg-[#FBF6E9]">
        <DialogHeader className="border-b border-[#EAD8A0] pb-4 px-6 pt-6">
          <DialogTitle className="font-display text-lg font-semibold text-[#2A1508]">
            Ordenar Produtos — {categoryName}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 overflow-y-auto overflow-x-hidden max-h-[60vh]">
          {products.length === 0 ? (
            <p className="text-center text-sm text-[#8A6F40] py-8">Nenhum produto nesta categoria.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
              <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {products.map((product) => (
                    <SortableProductItem key={product.id} product={product} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
        <DialogFooter className="border-t border-[#EAD8A0] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#EAD8A0] px-4 py-2.5 text-sm font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || products.length === 0}
            className="rounded-xl bg-[#6B3E14] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5C2F10] disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Ordem'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
