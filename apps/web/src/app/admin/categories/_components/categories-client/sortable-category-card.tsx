'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, ArrowUpDown, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminCategory } from '@/types/admin';

interface SortableCategoryCardProps {
  cat: AdminCategory;
  onEdit: () => void;
  onToggleActive: () => void;
  onReorderProducts: () => void;
}

export function SortableCategoryCard({
  cat,
  onEdit,
  onToggleActive,
  onReorderProducts,
}: SortableCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

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
        'rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] shadow-[0_0_8px_rgba(60,40,20,0.12)] overflow-hidden',
        'flex transition-shadow',
        isDragging && 'shadow-xl opacity-95 ring-2 ring-[#6B3E14]/30',
      )}
    >
      {/* Active indicator bar */}
      <div className={cn(
        'w-1 shrink-0',
        cat.isActive ? 'bg-emerald-400' : 'bg-red-300',
      )} />

      <div className="flex flex-1 items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button
            className="cursor-grab touch-none rounded p-1 text-[#B89D5F] transition-colors hover:text-[#8A6F40] active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <h3 className="font-semibold text-[#2A1508]">{cat.name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-[#FDF7E3] px-2.5 py-0.5 text-xs font-semibold text-[#8A6F40]">
                {cat.productCount} produtos
              </span>
              {!cat.isActive && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                  Inativa
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReorderProducts}
            title="Reordenar produtos"
            className="rounded-lg border border-[#EAD8A0] p-2 text-[#8A6F40] transition-colors hover:bg-[#FDF7E3] hover:text-[#6B3E14]"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg border border-[#EAD8A0] p-2 text-[#8A6F40] transition-colors hover:bg-[#FDF7E3] hover:text-[#6B3E14]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleActive}
            title={cat.isActive ? 'Desativar' : 'Ativar'}
            className={cn(
              'rounded-lg border p-2 transition-colors',
              cat.isActive
                ? 'border-[#EAD8A0] text-[#8A6F40] hover:bg-red-50 hover:text-red-600'
                : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
            )}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
