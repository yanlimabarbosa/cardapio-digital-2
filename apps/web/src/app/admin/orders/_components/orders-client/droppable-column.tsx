'use client';

import { cn } from '@/lib/utils';
import type { OrderSummary } from '@/types/admin';
import { OrderCardContent } from './order-card-content';

interface DroppableColumnProps {
  columnKey: string;
  label: string;
  dot: string;
  headerBg: string;
  orders: OrderSummary[];
  onAdvance: (orderId: string, currentStatus: string) => void;
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
  onAdvance,
  onCancel,
  onDeliver,
  pendingOrderId,
}: DroppableColumnProps) {
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
        className="flex-1 space-y-2 rounded-xl border-2 border-transparent bg-[#FAF6F1]/50 p-2 transition-colors"
        style={{ minHeight: 120 }}
      >
        {orders.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#C4B5A0]">Nenhum pedido</p>
        ) : (
          orders.map((order) => (
            <OrderCardContent
              key={order.id}
              order={order}
              onAdvance={() => onAdvance(order.id, order.status)}
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
