'use client';

import type { OrderResponse } from '@cardapio/shared';
import { OrderCard } from './order-card';

interface OrderKanbanProps {
  orders: OrderResponse[];
}

const COLUMNS = [
  { status: 'paid', title: 'Pagos', color: 'border-terra-500', bg: 'bg-terra-50' },
  { status: 'preparing', title: 'Preparando', color: 'border-amber-500', bg: 'bg-amber-50' },
  { status: 'ready', title: 'Prontos', color: 'border-emerald-500', bg: 'bg-emerald-50' },
  { status: 'out_for_delivery', title: 'Em Rota', color: 'border-purple-500', bg: 'bg-purple-50' },
];

export function OrderKanban({ orders }: OrderKanbanProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.status);

        return (
          <div key={col.status}>
            <div className={`mb-4 flex items-center gap-2 border-b-2 pb-2 ${col.color}`}>
              <h2 className="font-display font-semibold text-terra-900">{col.title}</h2>
              <span className={`rounded-full ${col.bg} px-2.5 py-0.5 text-xs font-bold`}>
                {colOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {colOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-terra-400">
                  Nenhum pedido
                </p>
              ) : (
                colOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
