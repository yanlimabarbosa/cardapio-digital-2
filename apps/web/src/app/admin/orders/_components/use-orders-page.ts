'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { WS_EVENTS } from '@cardapio/shared';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import { API_URL } from '@/lib/api-url';
import type { OrderSummary } from '@/types/admin';
import { useAutoReceiptPrint } from './use-auto-receipt-print';

export const KANBAN_COLUMNS = [
  { key: 'paid', label: 'A Fazer / Novo', dot: 'bg-blue-400', headerBg: 'bg-blue-50 border-blue-200' },
  { key: 'preparing', label: 'Preparando', dot: 'bg-orange-400', headerBg: 'bg-orange-50 border-orange-200' },
  { key: 'ready', label: 'Pronto', dot: 'bg-emerald-400', headerBg: 'bg-emerald-50 border-emerald-200' },
  { key: 'out_for_delivery', label: 'Em Rota', dot: 'bg-purple-400', headerBg: 'bg-purple-50 border-purple-200' },
] as const;

// Valid forward transitions (backend enforced too)
export const VALID_DROPS: Record<string, string[]> = {
  pending_payment: ['paid', 'cancelled'], // kept for legacy compat
  paid: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
};

// Step one stage BACK (kanban "Voltar"). Must match the reverse edges allowed
// by the backend OrderStatusTransitionPolicy.
export const VALID_BACK: Record<string, string> = {
  preparing: 'paid',
  ready: 'preparing',
  out_for_delivery: 'ready',
};

export const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Aguardando Pagamento',
  paid: 'Novo / Recebido',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Em Rota',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export function useOrdersPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const autoPrint = useAutoReceiptPrint();

  // Keep the latest auto-print state in a ref so the long-lived socket effect
  // reads the current `enabled` value without re-subscribing (and reconnecting)
  // every time the print station is toggled — avoids both reconnect churn and a
  // stale closure that would ignore toggles until reload.
  const autoPrintRef = useRef(autoPrint);
  autoPrintRef.current = autoPrint;

  const { data: orders, isLoading } = useQuery<OrderSummary[]>({
    queryKey: ['admin-orders'],
    queryFn: () => adminFetch('/api/admin/orders', token),
    // The kanban must feel live even if the websocket drops or a new order
    // never emits one: poll every 5s (also while the tab is backgrounded) and
    // refetch whenever the operator returns to the tab. staleTime 0 so these
    // refetches actually hit the network instead of serving a cached board.
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      adminFetch(`/api/orders/${orderId}/status`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-orders'] });
      const prev = queryClient.getQueryData<OrderSummary[]>(['admin-orders']);
      queryClient.setQueryData<OrderSummary[]>(['admin-orders'], (old) =>
        old?.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['admin-orders'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string }) =>
      adminFetch(`/api/admin/orders/${orderId}/driver`, token, {
        method: 'PATCH',
        body: JSON.stringify({ driverId }),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const columnOrders = useMemo(() => {
    if (!orders) return {};
    const grouped: Record<string, OrderSummary[]> = {};
    for (const col of KANBAN_COLUMNS) {
      grouped[col.key] = orders
        .filter((o) => o.status === col.key)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return grouped;
  }, [orders]);

  const completedOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((o) => o.status === 'delivered' || o.status === 'cancelled')
      .slice(0, 20);
  }, [orders]);

  // Real-time updates via WebSocket
  useEffect(() => {
    const socket = io(`${API_URL}/kitchen`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      auth: { token },
    });

    socket.on(WS_EVENTS.NEW_ORDER, () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    });

    socket.on(WS_EVENTS.ORDER_STATUS_CHANGED, (payload: { id: string; status: string }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      if (payload?.status === 'ready' && autoPrintRef.current.enabled) {
        autoPrintRef.current.printReceipt(payload.id);
      }
    });

    return () => { socket.disconnect(); };
  }, [queryClient, token]);

  function canDrop(fromStatus: string, toStatus: string) {
    return VALID_DROPS[fromStatus]?.includes(toStatus) ?? false;
  }

  return {
    orders,
    isLoading,
    columnOrders,
    completedOrders,
    updateStatusMutation,
    assignDriverMutation,
    canDrop,
    printStation: autoPrint,
  };
}
