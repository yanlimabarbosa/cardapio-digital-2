'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useOrderSocket } from '@/hooks/orders/use-order-socket';
import type { OrderResponse } from '@cardapio/shared';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Aguardando Pagamento', color: 'bg-amber-500' },
  paid: { label: 'Pago', color: 'bg-terra-600' },
  preparing: { label: 'Preparando', color: 'bg-terra-500' },
  ready: { label: 'Pronto', color: 'bg-emerald-600' },
  out_for_delivery: { label: 'Em Rota de Entrega', color: 'bg-purple-600' },
  delivered: { label: 'Entregue', color: 'bg-terra-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-600' },
};

const STEPS = ['pending_payment', 'paid', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

export function useOrderPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery<OrderResponse>({
    queryKey: ['order', id],
    queryFn: () => apiFetch(`/api/orders/${id}`),
    // Keep a slow poll as fallback in case websocket disconnects
    refetchInterval: 30000,
  });

  // Real-time updates via WebSocket
  useOrderSocket(id);

  const statusInfo = order
    ? STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment
    : null;
  const currentStep = order ? STEPS.indexOf(order.status) : -1;
  const progressWidth = Math.max(0, Math.min(100, ((currentStep - 1) / (STEPS.length - 2)) * 100));

  return {
    order,
    isLoading,
    statusInfo,
    currentStep,
    progressWidth,
    steps: STEPS,
    statusConfig: STATUS_CONFIG,
  };
}
