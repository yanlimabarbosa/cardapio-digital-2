'use client';

import { Fragment } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, Loader2, MapPin, Store, Clock, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useOrdersHistory } from './use-orders-history';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { DatePicker } from '@/components/ui/date-picker';
import { CustomSelect } from '@/components/ui/custom-select';
import { formatScheduledFor } from '@cardapio/shared';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Pago', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: 'Preparando', color: 'bg-orange-100 text-orange-700' },
  ready: { label: 'Pronto', color: 'bg-purple-100 text-purple-700' },
  out_for_delivery: { label: 'Em Rota', color: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Crédito',
  debit_card: 'Débito',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function OrdersHistoryClient() {
  const {
    orders,
    total,
    page,
    totalPages,
    setPage,
    search,
    handleSearch,
    status,
    handleStatusFilter,
    dateFrom,
    handleDateFrom,
    dateTo,
    handleDateTo,
    isLoading,
    expandedId,
    toggleExpand,
  } = useOrdersHistory();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#3D2B1F]">Histórico de Pedidos</h1>
          <p className="text-sm text-[#8B7355]">{total} {total === 1 ? 'pedido' : 'pedidos'} encontrados</p>
        </div>
        <Link href="/admin/orders">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#E8DDD0] bg-white px-4 py-2.5 text-sm font-semibold text-[#8B7355] transition-colors hover:bg-[#FAF6F1]">
            <Clock className="h-4 w-4" />
            Kanban ao vivo
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A0]" />
          <input
            type="text"
            placeholder="Buscar por nome ou #pedido..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#E8DDD0] bg-white pl-9 pr-4 text-sm text-[#3D2B1F] outline-none placeholder:text-[#C4B5A0] focus:border-[#D4C8BA] focus:ring-2 focus:ring-[#E8DDD0]/50"
          />
        </div>
        <div className="w-44">
          <CustomSelect
            value={status}
            onChange={handleStatusFilter}
            options={[
              { value: '', label: 'Todos os status' },
              ...Object.entries(STATUS_LABELS).map(([key, { label }]) => ({ value: key, label })),
            ]}
            placeholder="Todos os status"
          />
        </div>
        <div className="w-40">
          <DatePicker value={dateFrom} onChange={handleDateFrom} placeholder="Data inicio" />
        </div>
        <div className="w-40">
          <DatePicker value={dateTo} onChange={handleDateTo} placeholder="Data fim" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-terra-400" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E8DDD0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8DDD0] bg-[#FAF6F1]">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355]">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355]">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355] hidden sm:table-cell">Data</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355] hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355] hidden md:table-cell">Pagamento</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355]">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#8B7355]">Total</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DDD0]">
              {orders.map((order) => {
                const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' };
                const isExpanded = expandedId === order.id;
                const scheduledLabel = formatScheduledFor(order.scheduledFor);

                return (
                  <Fragment key={order.id}>
                    <tr
                      className="cursor-pointer transition-colors hover:bg-[#FAF6F1]"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <td className="px-4 py-3 font-bold text-terra-600">#{order.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#3D2B1F]">{order.customerName}</div>
                        <div className="text-xs text-[#8B7355] sm:hidden">{scheduledLabel ?? `${formatDate(order.createdAt)} ${formatTime(order.createdAt)}`}</div>
                      </td>
                      <td className="px-4 py-3 text-[#8B7355] hidden sm:table-cell">
                        <div>{scheduledLabel ? 'Agendado' : formatDate(order.createdAt)}</div>
                        <div className="text-xs">{scheduledLabel ?? formatTime(order.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {order.deliveryType === 'delivery' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600"><MapPin className="h-3 w-3" /> Entrega</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><Store className="h-3 w-3" /> Retirada</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#8B7355] hidden md:table-cell">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-terra-600">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <ChevronDown className={`h-4 w-4 text-[#C4B5A0] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-[#E8DDD0] bg-[#FAF6F1] px-4 py-3 space-y-2">
                                {order.customerPhone && (
                                  <p className="text-xs text-[#8B7355]">Tel: {order.customerPhone}</p>
                                )}
                                {order.deliveryAddress && (
                                  <p className="text-xs text-[#8B7355]">
                                    Endereço: {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}
                                  </p>
                                )}
                                {scheduledLabel && (
                                  <p className="text-xs font-semibold text-[#A0603A]">Agendado para {scheduledLabel}</p>
                                )}
                                <div className="space-y-1">
                                  {order.items.map((item) => (
                                    <div key={item.id} className="flex justify-between text-xs">
                                      <span className="text-[#3D2B1F]">
                                        {item.quantity}x {item.productName}
                                        {(item as any).groupedExtras && (item as any).groupedExtras.length > 0 ? (
                                          <span className="text-[#8B7355]"> ({(item as any).groupedExtras.flatMap((g: any) => g.options.map((o: any) => o.name)).join(', ')})</span>
                                        ) : item.extras && item.extras.length > 0 ? (
                                          <span className="text-[#8B7355]"> + {item.extras.map((e) => e.name).join(', ')}</span>
                                        ) : null}
                                      </span>
                                      <span className="text-[#8B7355]">{formatCurrency(item.subtotal)}</span>
                                    </div>
                                  ))}
                                </div>
                                {order.deliveryFee != null && order.deliveryFee > 0 && (
                                  <div className="flex justify-between text-xs border-t border-[#E8DDD0] pt-1">
                                    <span className="text-[#8B7355]">Taxa de entrega</span>
                                    <span className="text-[#8B7355]">{formatCurrency(order.deliveryFee)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-xs font-bold border-t border-[#E8DDD0] pt-1">
                                  <span className="text-[#3D2B1F]">Total</span>
                                  <span className="text-terra-600">{formatCurrency(order.totalAmount)}</span>
                                </div>
                                <div className="pt-2">
                                  <a
                                    href={`/receipt/${order.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8DDD0] bg-white px-3 py-1.5 text-xs font-semibold text-[#8B7355] transition-colors hover:bg-[#FAF6F1]"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Comprovante
                                  </a>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#C4B5A0]">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8DDD0] text-[#8B7355] transition-colors hover:bg-[#FAF6F1] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-[#8B7355]">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8DDD0] text-[#8B7355] transition-colors hover:bg-[#FAF6F1] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
