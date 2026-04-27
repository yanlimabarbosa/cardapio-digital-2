'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { OrderSummary } from '@/types/admin';
import { OrderCardContent } from './order-card-content';

interface DraggableCardProps {
  order: OrderSummary;
  onCancel: () => void;
  onDeliver: () => void;
  isPending: boolean;
}

export function DraggableCard({
  order,
  onCancel,
  onDeliver,
  isPending,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    data: { order },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-30',
      )}
    >
      <OrderCardContent
        order={order}
        onCancel={onCancel}
        onDeliver={onDeliver}
        isPending={isPending}
      />
    </div>
  );
}
