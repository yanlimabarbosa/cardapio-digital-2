'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useUpdateOrderStatus } from '@/hooks/orders/use-update-order-status';
import type { OrderResponse } from '@cardapio/shared';
import { ChevronRight, Loader2 } from 'lucide-react';

interface OrderCardProps {
  order: OrderResponse;
}

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  paid: { status: 'preparing', label: 'Preparar' },
  preparing: { status: 'ready', label: 'Pronto' },
  ready: { status: 'out_for_delivery', label: 'Enviar' },
  out_for_delivery: { status: 'delivered', label: 'Entregue' },
};

export function OrderCard({ order }: OrderCardProps) {
  const updateStatus = useUpdateOrderStatus(order.id);

  const next = NEXT_STATUS[order.status];
  const minutesAgo = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / 60000,
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-lg font-bold text-primary">
              #{order.orderNumber}
            </span>
            <h3 className="font-semibold">{order.customerName}</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {minutesAgo}min
          </Badge>
        </div>

        <div className="mt-1">
          {(order as any).deliveryType === 'delivery' ? (
            <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              Entrega
              {(order as any).deliveryAddress && (
                <span className="font-normal">
                  — {(order as any).deliveryAddress.street}, {(order as any).deliveryAddress.number}
                  {(order as any).deliveryAddress.neighborhood && ` · ${(order as any).deliveryAddress.neighborhood}`}
                </span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Retirada
            </span>
          )}
        </div>

        <div className="mt-3 space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium">{item.quantity}x</span> {item.productName}
              {(item as any).groupedExtras && (item as any).groupedExtras.length > 0 ? (
                <div className="ml-5 space-y-0.5">
                  {(item as any).groupedExtras.map((g: any, gi: number) => (
                    <p key={gi} className="text-xs text-muted-foreground">
                      {g.groupName}: {g.options.map((o: any) => o.name).join(', ')}
                    </p>
                  ))}
                </div>
              ) : item.extras && item.extras.length > 0 ? (
                <p className="ml-5 text-xs text-muted-foreground">
                  + {item.extras.map((e) => e.name).join(', ')}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="font-bold text-primary">
            {formatCurrency(order.totalAmount)}
          </span>
          {next && (
            <Button
              size="sm"
              data-testid={`order-action-${order.id}`}
              onClick={() => updateStatus.mutate(next.status)}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {next.label}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
