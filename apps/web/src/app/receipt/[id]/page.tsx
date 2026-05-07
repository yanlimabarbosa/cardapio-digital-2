'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import { Loader2, Printer, Download } from 'lucide-react';
import type { StoreSettingsData } from '@/types/admin';
import { formatScheduledFor } from '@cardapio/shared';

interface OrderExtra {
  name: string;
  price: number;
}

interface OrderItem {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  extras: OrderExtra[] | null;
}

interface OrderData {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  status: string;
  totalAmount: number;
  couponCode: string | null;
  discountAmount: number | null;
  deliveryFee: number | null;
  paymentMethod: string;
  paymentStatus: string | null;
  deliveryType: string;
  deliveryAddress: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
  notes: string | null;
  scheduledFor?: string | null;
  items: OrderItem[];
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Aguardando Pagamento',
  paid: 'Pago',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Em Rota',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartao de Credito',
  debit_card: 'Cartao de Debito',
};

function formatCurrencyReceipt(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [settings, setSettings] = useState<StoreSettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !params.id) return;

    async function load() {
      try {
        const [orderData, settingsData] = await Promise.all([
          adminFetch<OrderData>(`/api/orders/${params.id}`, token),
          adminFetch<StoreSettingsData>('/api/admin/store-settings', token),
        ]);
        setOrder(orderData);
        setSettings(settingsData);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token, params.id]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-sm text-red-500">{error || 'Pedido nao encontrado'}</p>
      </div>
    );
  }

  const storeName = 'BEM COMER SELF-SERVICE';
  const LINE = '================================';
  const DASH = '--------------------------------';

  // Calculate items subtotal (base items + extras, before delivery fee and discounts)
  const subtotal = order.items.reduce((sum, item) => {
    return sum + item.subtotal;
  }, 0);
  const scheduledLabel = formatScheduledFor(order.scheduledFor);

  return (
    <div className="flex min-h-dvh flex-col items-center bg-gray-100 py-8 print:bg-white print:py-0">
      {/* Action buttons - hidden on print */}
      <div className="mb-4 flex gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3D2B1F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2A1D16]"
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Baixar PDF
        </button>
      </div>
      <p className="mb-4 text-xs text-gray-400 print:hidden">
        Para baixar como PDF, escolha &quot;Salvar como PDF&quot; na janela de impressao.
      </p>

      {/* Receipt */}
      <div className="receipt-paper w-[300px] bg-white px-4 py-6 font-mono text-[11px] leading-relaxed text-gray-900 shadow-md print:w-full print:max-w-[300px] print:shadow-none">
        {/* Header */}
        <pre className="whitespace-pre-wrap text-center">{LINE}</pre>
        <p className="text-center font-bold">{storeName}</p>
        {settings?.receiptCnpj && (
          <p className="text-center">CNPJ: {settings.receiptCnpj}</p>
        )}
        {settings?.receiptAddress && (
          <p className="text-center">{settings.receiptAddress}</p>
        )}
        {settings?.receiptPhone && (
          <p className="text-center">Tel: {settings.receiptPhone}</p>
        )}
        <pre className="whitespace-pre-wrap text-center">{LINE}</pre>

        <p className="text-center font-bold">CUPOM NAO FISCAL</p>
        <p className="text-center">
          Pedido #{order.orderNumber} — {formatDateTime(order.createdAt)}
        </p>
        {scheduledLabel && (
          <p className="text-center font-bold">AGENDADO: {scheduledLabel}</p>
        )}

        <pre className="mt-2 whitespace-pre-wrap">{DASH}</pre>

        {/* Column headers */}
        <div className="flex justify-between">
          <span className="flex-1 font-bold">ITEM</span>
          <span className="w-8 text-right font-bold">QTD</span>
          <span className="w-16 text-right font-bold">VLR</span>
        </div>

        {/* Items */}
        {order.items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between">
              <span className="flex-1 truncate">{item.productName}</span>
              <span className="w-8 text-right">{item.quantity}</span>
              <span className="w-16 text-right">{formatCurrencyReceipt(item.subtotal)}</span>
            </div>
            {(item as any).groupedExtras && (item as any).groupedExtras.length > 0 ? (
              (item as any).groupedExtras.flatMap((g: any) => g.options).map((opt: any, idx: number) => (
                <div key={idx} className="flex justify-between text-gray-600">
                  <span className="flex-1 pl-2">+ {opt.name}</span>
                  <span className="w-8" />
                  <span className="w-16 text-right">{opt.price > 0 ? formatCurrencyReceipt(opt.price * item.quantity) : ''}</span>
                </div>
              ))
            ) : item.extras && item.extras.length > 0 ? (
              item.extras.map((extra, idx) => (
                <div key={idx} className="flex justify-between text-gray-600">
                  <span className="flex-1 pl-2">+ {extra.name}</span>
                  <span className="w-8" />
                  <span className="w-16 text-right">{formatCurrencyReceipt(extra.price * item.quantity)}</span>
                </div>
              ))
            ) : null}
          </div>
        ))}

        <pre className="whitespace-pre-wrap">{DASH}</pre>

        {/* Totals */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>SUBTOTAL</span>
            <span>R$ {formatCurrencyReceipt(subtotal)}</span>
          </div>

          {order.discountAmount != null && order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>DESCONTO{order.couponCode ? ` (${order.couponCode})` : ''}</span>
              <span>-R$ {formatCurrencyReceipt(order.discountAmount)}</span>
            </div>
          )}

          {order.deliveryFee != null && order.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>TAXA ENTREGA</span>
              <span>R$ {formatCurrencyReceipt(order.deliveryFee)}</span>
            </div>
          )}
        </div>

        <pre className="whitespace-pre-wrap">{LINE}</pre>

        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>R$ {formatCurrencyReceipt(order.totalAmount)}</span>
        </div>

        <pre className="whitespace-pre-wrap">{LINE}</pre>

        {/* Payment & Status */}
        <p>PAGAMENTO: {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
        {scheduledLabel && <p>HORARIO: {scheduledLabel}</p>}

        {/* Customer info */}
        <div className="mt-2">
          <p>Cliente: {order.customerName}</p>
          {order.customerPhone && <p>Tel: {order.customerPhone}</p>}
        </div>

        {/* Delivery address */}
        {order.deliveryType === 'delivery' && order.deliveryAddress && (
          <div className="mt-2">
            <p>Entrega:</p>
            <p>{order.deliveryAddress.street}, {order.deliveryAddress.number}</p>
            {order.deliveryAddress.complement && <p>{order.deliveryAddress.complement}</p>}
            <p>{order.deliveryAddress.neighborhood} - {order.deliveryAddress.city}/{order.deliveryAddress.state}</p>
          </div>
        )}

        {order.deliveryType === 'pickup' && (
          <div className="mt-2">
            <p className="font-bold">RETIRADA NO LOCAL</p>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="mt-2">
            <p>Obs: {order.notes}</p>
          </div>
        )}

        {/* Footer */}
        {settings?.receiptFooter && (
          <>
            <pre className="mt-2 whitespace-pre-wrap text-center">{LINE}</pre>
            <p className="text-center">{settings.receiptFooter}</p>
            <pre className="whitespace-pre-wrap text-center">{LINE}</pre>
          </>
        )}
      </div>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      ` }} />
    </div>
  );
}
