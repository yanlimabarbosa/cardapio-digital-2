'use client';

import { Search, ChevronLeft, ChevronRight, ChevronDown, Loader2, MapPin, Store, Clock, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useOrdersHistory } from './use-orders-history';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { DatePicker } from '@/components/ui/date-picker';
import { CustomSelect } from '@/components/ui/custom-select';

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
          <h1 className="font-display text-2xl font-bold text-[#2A1508]">Histórico de Pedidos</h1>
          <p className="text-sm text-[#8A6F40]">{total} {total === 1 ? 'pedido' : 'pedidos'} encontrados</p>
        </div>
        <Link href="/admin/orders">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#EAD8A0] bg-white px-4 py-2.5 text-sm font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]">
            <Clock className="h-4 w-4" />
            Kanban ao vivo
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B89D5F]" />
          <input
            type="text"
            placeholder="Buscar por nome ou #pedido..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#EAD8A0] bg-white pl-9 pr-4 text-sm text-[#2A1508] outline-none placeholder:text-[#B89D5F] focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50"
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
        <div className="overflow-hidden rounded-xl border border-[#EAD8A0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EAD8A0] bg-[#FDF7E3]">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#7A4F1C]">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#7A4F1C]">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#7A4F1C] hidden sm:table-cell">Data</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#7A4F1C] hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#7A4F1C] hidden md:table-cell">Pagamento</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#7A4F1C]">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#7A4F1C]">Total</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAD8A0]">
              {orders.map((order) => {
                const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' };
                const isExpanded = expandedId === order.id;

                return (
                  <Fragment key={order.id}>
                    <tr
                      className="cursor-pointer transition-colors hover:bg-[#FDF7E3]"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <td className="px-4 py-3 font-bold text-terra-600">#{order.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#2A1508]">{order.customerName}</div>
                        <div className="text-xs text-[#8A6F40] sm:hidden">{formatDate(order.createdAt)} {formatTime(order.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-[#8A6F40] hidden sm:table-cell">
                        <div>{formatDate(order.createdAt)}</div>
                        <div className="text-xs">{formatTime(order.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {order.deliveryType === 'delivery' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600"><MapPin className="h-3 w-3" /> Entrega</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><Store className="h-3 w-3" /> Retirada</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#8A6F40] hidden md:table-cell">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-terra-600">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <ChevronDown className={`h-4 w-4 text-[#B89D5F] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
                              <div className="border-t border-[#EAD8A0] bg-[#FDF7E3] px-4 py-3 space-y-2">
                                {order.customerPhone && (
                                  <p className="text-xs text-[#8A6F40]">Tel: {order.customerPhone}</p>
                                )}
                                {order.deliveryAddress && (
                                  <p className="text-xs text-[#8A6F40]">
                                    Endereço: {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}
                                  </p>
                                )}
                                <div className="space-y-1">
                                  {order.items.map((item) => (
                                    <div key={item.id} className="flex justify-between text-xs">
                                      <span className="text-[#2A1508]">
                                        {item.quantity}x {item.productName}
                                        {(item as any).groupedExtras && (item as any).groupedExtras.length > 0 ? (
                                          <span className="text-[#8A6F40]"> ({(item as any).groupedExtras.flatMap((g: any) => g.options.map((o: any) => o.name)).join(', ')})</span>
                                        ) : item.extras && item.extras.length > 0 ? (
                                          <span className="text-[#8A6F40]"> + {item.extras.map((e) => e.name).join(', ')}</span>
                                        ) : null}
                                      </span>
                                      <span className="text-[#8A6F40]">{formatCurrency(item.subtotal)}</span>
                                    </div>
                                  ))}
                                </div>
                                {order.deliveryFee != null && order.deliveryFee > 0 && (
                                  <div className="flex justify-between text-xs border-t border-[#EAD8A0] pt-1">
                                    <span className="text-[#8A6F40]">Taxa de entrega</span>
                                    <span className="text-[#8A6F40]">{formatCurrency(order.deliveryFee)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-xs font-bold border-t border-[#EAD8A0] pt-1">
                                  <span className="text-[#2A1508]">Total</span>
                                  <span className="text-terra-600">{formatCurrency(order.totalAmount)}</span>
                                </div>
                                <div className="pt-2">
                                  <a
                                    href={`/receipt/${order.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAD8A0] bg-white px-3 py-1.5 text-xs font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]"
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
                  <td colSpan={8} className="px-4 py-8 text-center text-[#B89D5F]">
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EAD8A0] text-[#8A6F40] transition-colors hover:bg-[#FDF7E3] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-[#8A6F40]">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EAD8A0] text-[#8A6F40] transition-colors hover:bg-[#FDF7E3] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// React Fragment import
import { Fragment } from 'react';
