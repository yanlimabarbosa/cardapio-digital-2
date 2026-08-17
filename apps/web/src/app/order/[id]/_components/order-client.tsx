'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CustomerHeader, CustomerPage } from '@/components/customer/customer-page-shell';
import { formatCurrency } from '@/lib/utils';
import { toMetaContents, trackMetaPixel } from '@/lib/meta-pixel';
import { formatScheduledFor } from '@cardapio/shared';
import { CheckCircle, Clock, ChefHat, PackageCheck, Home, Truck } from 'lucide-react';
import { useOrderPage } from './use-order-page';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending_payment: <Clock className="h-6 w-6" />,
  paid: <CheckCircle className="h-6 w-6" />,
  preparing: <ChefHat className="h-6 w-6" />,
  ready: <PackageCheck className="h-6 w-6" />,
  out_for_delivery: <Truck className="h-6 w-6" />,
  delivered: <CheckCircle className="h-6 w-6" />,
  cancelled: <Clock className="h-6 w-6" />,
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
};

export function OrderClient() {
  const { order, isLoading, statusInfo, currentStep, progressWidth, steps, statusConfig } = useOrderPage();

  useEffect(() => {
    if (!order || !isPaidForPixel(order.status)) return;
    const storageKey = `meta-pixel-purchase:${order.id}`;
    if (window.localStorage.getItem(storageKey)) return;

    trackMetaPixel(
      'Purchase',
      {
        content_ids: order.items.map((item) => item.productId),
        content_type: 'product',
        contents: toMetaContents(order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          itemPrice: item.unitPrice,
        }))),
        currency: 'BRL',
        num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
        order_id: order.id,
        value: order.totalAmount,
      },
      { eventID: order.id },
    );
    window.localStorage.setItem(storageKey, '1');
  }, [order]);

  if (isLoading) {
    return (
      <CustomerPage className="flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-terra-600 border-t-transparent" />
      </CustomerPage>
    );
  }

  if (!order) {
    return (
      <CustomerPage>
        <CustomerHeader title="Pedido" backHref="/" />
        <div className="container px-4 py-12 text-center">
          <p className="text-terra-700">Pedido não encontrado.</p>
          <Link href="/">
            <Button className="mt-4 bg-terra-600 text-white hover:bg-terra-700">Voltar ao cardápio</Button>
          </Link>
        </div>
      </CustomerPage>
    );
  }

  const icon = STATUS_ICONS[order.status] || STATUS_ICONS.pending_payment;
  const scheduledLabel = formatScheduledFor(order.scheduledFor);

  return (
    <CustomerPage className="pb-8">
      <CustomerHeader title={`Pedido #${order.orderNumber}`} backHref="/" />

      <div className="container px-4 py-6 space-y-6">
        <Card className="border-terra-200 overflow-hidden">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className={`rounded-full p-4 text-white shadow-lg ${statusInfo!.color}`}>
              {icon}
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-terra-900">{statusInfo!.label}</h2>
            <p className="text-sm text-terra-500">{order.customerName}</p>
            {scheduledLabel && (
              <p className="mt-2 rounded-full bg-butter-100 px-3 py-1 text-sm font-semibold text-cocoa-800">
                Agendado para {scheduledLabel}
              </p>
            )}
          </CardContent>
        </Card>

        {order.status !== 'cancelled' && (
          <div className="relative flex items-start justify-between px-6">
            <div className="absolute left-6 right-6 top-2 h-0.5 bg-terra-200" />
            <div
              className="absolute left-6 top-2 h-0.5 bg-terra-600 transition-all"
              style={{ width: `${progressWidth}%` }}
            />
            {steps.slice(1).map((step, i) => {
              const isActive = currentStep >= i + 1;
              const isCurrent = currentStep === i + 1;
              return (
                <div key={step} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div
                    className={`h-4 w-4 rounded-full border-2 transition-all ${
                      isCurrent
                        ? 'border-terra-600 bg-terra-600 ring-4 ring-terra-200'
                        : isActive
                          ? 'border-terra-600 bg-terra-600'
                          : 'border-terra-300 bg-white'
                    }`}
                  />
                  <span className={`text-[10px] ${
                    isActive
                      ? 'font-semibold text-terra-700'
                      : 'text-terra-400'
                  }`}>
                    {statusConfig[step]?.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <Card className="border-terra-200 bg-butter-100">
            <CardContent className="p-4">
              <h3 className="mb-1 font-display font-semibold text-terra-900">Pagamento</h3>
              <p className="text-sm text-terra-700">
                {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
              </p>
              <p className="mt-1 text-sm font-medium text-terra-600">
                {order.deliveryType === 'delivery'
                  ? 'Você paga na entrega, quando o motoboy chegar.'
                  : 'Você paga no balcão, na hora da retirada.'}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-terra-200">
          <CardContent className="p-4">
            <h3 className="mb-3 font-display font-semibold text-terra-900">Itens do Pedido</h3>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <div>
                  <span className="text-terra-800">{item.quantity}x {item.productName}</span>
                  {(item as any).groupedExtras && (item as any).groupedExtras.length > 0 ? (
                    <div className="space-y-0.5">
                      {(item as any).groupedExtras.map((g: any, gi: number) => (
                        <p key={gi} className="text-xs text-terra-400">
                          {g.groupName}: {g.options.map((o: any) => o.name).join(', ')}
                        </p>
                      ))}
                    </div>
                  ) : item.extras && item.extras.length > 0 ? (
                    <p className="text-xs text-terra-400">
                      + {item.extras.map((e) => e.name).join(', ')}
                    </p>
                  ) : null}
                </div>
                <span className="font-medium text-terra-700">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
            <Separator className="my-2 bg-terra-200" />
            {order.deliveryFee != null && order.deliveryFee > 0 && (
              <>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-terra-500">Subtotal</span>
                  <span className="text-terra-600">{formatCurrency(order.totalAmount - order.deliveryFee)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-terra-500">Taxa de entrega</span>
                  <span className="text-terra-600">{formatCurrency(order.deliveryFee)}</span>
                </div>
                <Separator className="my-1 bg-terra-200" />
              </>
            )}
            <div className="flex justify-between font-bold">
              <span className="text-terra-900">Total</span>
              <span className="font-display text-terra-600">{formatCurrency(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        <Link href="/" className="block">
          <Button variant="outline" className="w-full border-terra-300 text-terra-700 hover:bg-terra-100 hover:text-terra-800">
            <Home className="mr-2 h-4 w-4" />
            Fazer novo pedido
          </Button>
        </Link>
      </div>
    </CustomerPage>
  );
}

function isPaidForPixel(status: string): boolean {
  return ['paid', 'preparing', 'ready', 'out_for_delivery', 'delivered'].includes(status);
}
