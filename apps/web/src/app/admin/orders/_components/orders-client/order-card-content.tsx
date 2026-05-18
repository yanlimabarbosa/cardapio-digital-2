'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { formatScheduledFor } from '@cardapio/shared';
import { Tooltip } from '@/components/ui/tooltip';
import { Loader2, Clock, ChevronDown, ChevronUp, X, Check, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderSummary } from '@/types/admin';

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h${mins % 60 > 0 ? `${mins % 60}m` : ''}`;
}

interface OrderCardContentProps {
  order: OrderSummary;
  compact?: boolean;
  onCancel?: () => void;
  onDeliver?: () => void;
  isPending?: boolean;
}

export function OrderCardContent({
  order,
  compact,
  onCancel,
  onDeliver,
  isPending,
}: OrderCardContentProps) {
  const [expanded, setExpanded] = useState(false);
  const scheduledLabel = formatScheduledFor(order.scheduledFor);

  return (
    <div className={cn(
      'rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-3 shadow-sm',
      !compact && 'transition-shadow hover:shadow-md',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-sm font-semibold text-[#A0603A]">
              #{order.orderNumber ?? '—'}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-[#8B7355]">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo(order.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-[#3D2B1F] truncate">{order.customerName}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-display text-sm font-semibold text-[#3D2B1F]">
            {formatCurrency(order.totalAmount)}
          </span>
          {onCancel && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <Tooltip label="Cancelar pedido">
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
                disabled={isPending}
                aria-label="Cancelar pedido"
                className="rounded p-0.5 text-[#C4B5A0] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        {order.deliveryType === 'delivery' ? (
          <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            Entrega
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Retirada
          </span>
        )}
        <span className="rounded-full bg-[#FAF6F1] border border-[#E8DDD0] px-2 py-0.5 text-[10px] font-semibold text-[#8B7355]">
          {order.paymentMethod === 'pix' ? 'Pix' : order.paymentMethod === 'debit_card' ? 'Débito' : 'Crédito'}
        </span>
        {scheduledLabel && (
          <span className="rounded-full bg-butter-100 border border-butter-300 px-2 py-0.5 text-[10px] font-semibold text-cocoa-800">
            {scheduledLabel}
          </span>
        )}
      </div>

      {!compact && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="mt-2 flex items-center gap-1 text-xs text-[#8B7355] hover:text-[#A0603A] transition-colors"
          >
            <span className="font-semibold">{order.itemCount} {order.itemCount === 1 ? 'item' : 'itens'}</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {expanded && (
            <div className="mt-1.5 space-y-0.5 rounded-lg bg-[#FAF6F1] p-2">
              {order.items.map((item, i) => (
                <div key={i} className="text-xs text-[#3D2B1F]">
                  <span className="font-semibold">{item.quantity}x</span> {item.productName}
                  {item.groupedExtras && item.groupedExtras.length > 0 ? (
                    <div className="ml-4 space-y-0.5">
                      {item.groupedExtras.map((g, gi) => (
                        <p key={gi} className="text-[10px] text-[#8B7355]">
                          {g.groupName}: {g.options.map((o) => o.name).join(', ')}
                        </p>
                      ))}
                    </div>
                  ) : item.extras && item.extras.length > 0 ? (
                    <p className="ml-4 text-[10px] text-[#8B7355]">
                      + {item.extras.map((e) => e.name).join(', ')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {order.status !== 'pending_payment' && order.status !== 'cancelled' && (
            <Link
              href={`/receipt/${order.id}`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 flex items-center gap-1 text-xs text-[#8B7355] hover:text-[#A0603A] transition-colors"
            >
              <Receipt className="h-3 w-3" />
              Comprovante
            </Link>
          )}

          {onDeliver && order.status === 'out_for_delivery' && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeliver(); }}
              disabled={isPending}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  Marcar Entregue
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
