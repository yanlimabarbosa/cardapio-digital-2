'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminProduct } from '@/types/admin';

interface SortableProductItemProps {
  product: AdminProduct;
}

export function SortableProductItem({ product }: SortableProductItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-3',
        isDragging && 'shadow-lg opacity-90',
      )}
    >
      <button
        className="cursor-grab touch-none rounded p-1 text-[#C4B5A0] transition-colors hover:text-[#8B7355] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-[#3D2B1F]">{product.name}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-[#8B7355]">
        R$ {product.price.toFixed(2)}
      </span>
    </div>
  );
}
