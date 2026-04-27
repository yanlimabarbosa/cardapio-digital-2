'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCustomerStore } from '@/stores/customer-store';
import { useCustomerOrders } from '@/hooks/customer/use-customer-orders';
import { SetPasswordDialog } from '@/components/auth/set-password-dialog';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { ArrowLeft, Lock, PackageCheck, Clock, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const ACTIVE_STATUSES = ['pending_payment', 'paid', 'preparing', 'ready', 'out_for_delivery'];

function StatusBadge({ status }: { status: string }) {
  const isActive = ACTIVE_STATUSES.includes(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      status === 'delivered' ? 'bg-green-100 text-green-700' :
      status === 'cancelled' ? 'bg-red-100 text-red-700' :
      'bg-amber-100 text-amber-700'
    }`}>
      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function MyOrdersClient() {
  const { token, hasPassword } = useCustomerStore();
  const { data, isLoading } = useCustomerOrders();
  const [authOpen, setAuthOpen] = useState(false);
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);

  // Not logged in
  if (!token) {
    return (
      <main className="min-h-dvh bg-terra-50">
        <header className="bg-terra-600 px-4 py-4 text-white">
          <div className="container flex items-center gap-3">
            <Link href="/" className="rounded-full p-1 hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-lg font-semibold">Meus Pedidos</h1>
          </div>
        </header>
        <div className="container px-4 py-12 text-center">
          <PackageCheck className="mx-auto h-12 w-12 text-terra-300" />
          <h2 className="mt-4 font-display text-lg font-semibold text-terra-900">
            Entre para ver seus pedidos
          </h2>
          <p className="mt-1 text-sm text-terra-800/60">
            Identifique-se para acompanhar e ver o historico dos seus pedidos
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-6 rounded-lg bg-terra-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-terra-700"
          >
            Entrar / Cadastrar
          </button>
          <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
        </div>
      </main>
    );
  }

  const orders = data?.orders ?? [];
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const finishedOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <main className="min-h-dvh bg-terra-50">
      <header className="bg-terra-600 px-4 py-4 text-white">
        <div className="container flex items-center gap-3">
          <Link href="/" className="rounded-full p-1 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-lg font-semibold">Meus Pedidos</h1>
        </div>
      </header>

      <div className="container px-4 py-6 space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-terra-600 border-t-transparent" />
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="py-12 text-center">
            <PackageCheck className="mx-auto h-12 w-12 text-terra-300" />
            <h2 className="mt-4 font-display text-lg font-semibold text-terra-900">
              Nenhum pedido ainda
            </h2>
            <p className="mt-1 text-sm text-terra-800/60">
              Faca seu primeiro pedido no cardapio!
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-terra-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-terra-700"
            >
              Ver Cardapio
            </Link>
          </div>
        )}

        {/* Active orders */}
        {activeOrders.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-base font-semibold text-terra-900">
              Pedidos em andamento
            </h2>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="flex items-center justify-between rounded-xl border border-terra-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-terra-900">
                        Pedido #{order.orderNumber}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-terra-800/50">
                      <span>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-terra-300" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Finished orders */}
        {hasPassword ? (
          finishedOrders.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-semibold text-terra-900">
                Pedidos finalizados
              </h2>
              <div className="space-y-3">
                {finishedOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/order/${order.id}`}
                    className="flex items-center justify-between rounded-xl border border-terra-200 bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-terra-900">
                          Pedido #{order.orderNumber}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-terra-800/50">
                        <span>{formatCurrency(order.totalAmount)}</span>
                        <span>
                          {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-terra-300" />
                  </Link>
                ))}
              </div>
            </section>
          )
        ) : (
          <section>
            <button
              onClick={() => setSetPasswordOpen(true)}
              className="flex w-full items-center gap-4 rounded-xl border border-terra-200 bg-white p-4 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terra-100">
                <Lock className="h-5 w-5 text-terra-600" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-terra-900">Pedidos finalizados</p>
                <p className="text-xs text-terra-800/60">
                  Os pedidos finalizados sao mostrados apenas apos o cadastro de uma senha.
                </p>
                <p className="mt-1 text-xs font-medium text-terra-600">
                  Clique aqui e cadastre sua senha
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-terra-300" />
            </button>
          </section>
        )}
      </div>

      <SetPasswordDialog open={setPasswordOpen} onOpenChange={setSetPasswordOpen} />
    </main>
  );
}
