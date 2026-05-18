'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, ArrowUpDown, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminCategory } from '@/types/admin';

interface SortableCategoryCardProps {
  cat: AdminCategory;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onReorderProducts: () => void;
}

export function SortableCategoryCard({
  cat,
  onEdit,
  onToggleActive,
  onDelete,
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
        'rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] shadow-[0_0_8px_rgba(61,43,31,0.12)] overflow-hidden',
        'flex transition-shadow',
        isDragging && 'shadow-xl opacity-95 ring-2 ring-[#A0603A]/30',
      )}
    >
      {/* Active indicator bar */}
      <div className={cn(
        'w-1 shrink-0',
        cat.isActive ? 'bg-emerald-400' : 'bg-slate-300',
      )} />

      <div className="flex flex-1 items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button
            className="cursor-grab touch-none rounded p-1 text-[#C4B5A0] transition-colors hover:text-[#8B7355] active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <h3 className="font-semibold text-[#3D2B1F]">{cat.name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-[#FAF6F1] px-2.5 py-0.5 text-xs font-semibold text-[#8B7355]">
                {cat.productCount} produtos
              </span>
              {!cat.isActive && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  Oculta
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReorderProducts}
            aria-label="Reordenar produtos"
            className="rounded-lg border border-[#E8DDD0] p-2 text-[#8B7355] transition-colors hover:bg-[#FAF6F1] hover:text-[#A0603A]"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg border border-[#E8DDD0] p-2 text-[#8B7355] transition-colors hover:bg-[#FAF6F1] hover:text-[#A0603A]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleActive}
            aria-label={cat.isActive ? 'Ocultar categoria' : 'Mostrar categoria'}
            className={cn(
              'rounded-lg border p-2 transition-colors',
              cat.isActive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-[#E8DDD0] bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {cat.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onDelete}
            aria-label="Excluir categoria"
            className="rounded-lg border border-[#E8DDD0] p-2 text-[#8B7355] transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
