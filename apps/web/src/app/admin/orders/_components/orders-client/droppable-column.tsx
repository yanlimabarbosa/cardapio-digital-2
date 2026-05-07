'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { OrderSummary } from '@/types/admin';
import { DraggableCard } from './draggable-card';

interface DroppableColumnProps {
  columnKey: string;
  label: string;
  dot: string;
  headerBg: string;
  orders: OrderSummary[];
  isOver: boolean;
  canAccept: boolean;
  onCancel: (orderId: string) => void;
  onDeliver: (orderId: string) => void;
  pendingOrderId: string | null;
}

export function DroppableColumn({
  columnKey,
  label,
  dot,
  headerBg,
  orders,
  isOver,
  canAccept,
  onCancel,
  onDeliver,
  pendingOrderId,
}: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id: columnKey });

  return (
    <div className="flex min-w-[240px] flex-1 flex-col min-h-[200px] lg:min-w-0">
      <div className={cn(
        'mb-2 flex items-center gap-2 rounded-lg border px-3 py-2',
        headerBg,
      )}>
        <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', dot)} />
        <h2 className="font-display text-sm font-semibold text-[#3D2B1F]">{label}</h2>
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-[#8B7355]">
          {orders.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 rounded-xl border-2 border-dashed p-2 transition-colors',
          isOver && canAccept
            ? 'border-[#A0603A] bg-[#A0603A]/5'
            : isOver && !canAccept
              ? 'border-red-300 bg-red-50/50'
              : 'border-transparent bg-[#FAF6F1]/50',
        )}
        style={{ minHeight: 120 }}
      >
        {orders.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#C4B5A0]">Nenhum pedido</p>
        ) : (
          orders.map((order) => (
            <DraggableCard
              key={order.id}
              order={order}
              onCancel={() => onCancel(order.id)}
              onDeliver={() => onDeliver(order.id)}
              isPending={pendingOrderId === order.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
