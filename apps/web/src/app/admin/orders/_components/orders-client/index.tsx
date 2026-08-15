'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useOrdersPage,
  KANBAN_COLUMNS,
  STATUS_LABELS,
  VALID_DROPS,
} from '../use-orders-page';
import { cn } from '@/lib/utils';
import { DroppableColumn } from './droppable-column';

export function OrdersClient() {
  const {
    isLoading,
    columnOrders,
    completedOrders,
    updateStatusMutation,
  } = useOrdersPage();

  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  function handleAdvance(orderId: string, currentStatus: string) {
    const nextStatuses = VALID_DROPS[currentStatus];
    if (!nextStatuses || nextStatuses.length === 0) return;
    
    // The first valid drop is the next logical step in the pipeline (ignoring 'cancelled' which is typically at the end)
    const nextStatus = nextStatuses.find(s => s !== 'cancelled');
    if (!nextStatus) return;

    setPendingOrderId(orderId);
    updateStatusMutation.mutate(
      { orderId, status: nextStatus },
      { onSettled: () => setPendingOrderId(null) },
    );
  }

  function handleCancel(orderId: string) {
    setPendingOrderId(orderId);
    updateStatusMutation.mutate(
      { orderId, status: 'cancelled' },
      { onSettled: () => setPendingOrderId(null) },
    );
  }

  function handleDeliver(orderId: string) {
    setPendingOrderId(orderId);
    updateStatusMutation.mutate(
      { orderId, status: 'delivered' },
      { onSettled: () => setPendingOrderId(null) },
    );
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-semibold text-[#3D2B1F]">Pedidos</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#A0603A]" />
        </div>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
            {KANBAN_COLUMNS.map((col) => (
              <DroppableColumn
                key={col.key}
                columnKey={col.key}
                label={col.label}
                dot={col.dot}
                headerBg={col.headerBg}
                orders={columnOrders[col.key] || []}
                onAdvance={handleAdvance}
                onCancel={handleCancel}
                onDeliver={handleDeliver}
                pendingOrderId={pendingOrderId}
              />
            ))}
          </div>

          {completedOrders.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm font-semibold text-[#8B7355] transition-colors hover:text-[#A0603A]"
              >
                {showCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Finalizados ({completedOrders.length})
              </button>

              {showCompleted && (
                <div className="mt-2 space-y-1.5">
                  {completedOrders.map((order) => (
                    <div
                      key={order.id}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-4 py-2.5',
                        order.status === 'delivered'
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-red-200 bg-red-50',
                      )}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-[#8B7355]">
                          #{order.orderNumber ?? '—'}
                        </span>
                        <span className="text-sm text-[#3D2B1F]">{order.customerName}</span>
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          order.status === 'delivered'
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-red-200 text-red-700',
                        )}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-[#8B7355]">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
