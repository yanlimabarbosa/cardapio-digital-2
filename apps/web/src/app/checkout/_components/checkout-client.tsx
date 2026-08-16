'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, QrCode, CreditCard, Clock, Award, Check, Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import { useCheckoutPage } from './use-checkout-page';

export function CheckoutClient() {
  const {
    items,
    paymentMethod,
    setPaymentMethod,
    error,
    totalAmount,
    subtotal,
    deliveryFee,
    deliveryType,
    scheduledForLabel,
    couponCode,
    couponDiscount,
    handlePay,
    createOrderPending,
    storeClosed,
    redeemableProducts,
    redeemedItems,
    toggleRedeemItem,
    loyaltyBalance,
  } = useCheckoutPage();

  const isDelivery = deliveryType === 'delivery';

  return (
    <main className="order-flow-brown min-h-dvh bg-cream-warm pb-36">
      <header className="relative overflow-hidden bg-cocoa-noise px-4 py-4 text-white">
        <div className="absolute inset-0 tapioca-grain opacity-40" />
        <div className="container relative flex items-center gap-3">
          <Link href="/cart">
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <Link href="/"><img src="/logo.png" alt="Bem Comer Self-Service" className="h-10 w-10 rounded-full object-cover" /></Link>
          <h1 className="font-display text-xl font-semibold">Confirmar Pedido</h1>
        </div>
      </header>

      <div className="container px-4 pt-5 pb-4 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-4"
        >
          <h2 className="mb-3 text-sm font-semibold text-terra-700">Resumo do pedido</h2>
          {scheduledForLabel && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-butter-100 px-3 py-2 text-sm font-semibold text-cocoa-800">
              <Clock className="h-4 w-4" />
              Agendado para {scheduledForLabel}
            </div>
          )}
          <div className="space-y-2.5">
            {items.map((item) => {
              let optPrice = 0;
              if (item.optionSelections?.length) {
                optPrice = item.optionSelections.reduce((gs, g) => gs + g.options.reduce((os, o) => os + o.price, 0), 0);
              } else {
                optPrice = item.extras.reduce((s, e) => s + e.price, 0);
              }
              const lineTotal = (item.unitPrice + optPrice) * item.quantity;
              const imgSrc = getImageUrl(item.imageUrl);

              return (
                <div key={item.key} className="flex items-center gap-3">
                  {imgSrc ? (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-terra-100">
                      <img src={imgSrc} alt={item.productName} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-terra-100 to-terra-200">
                      <span className="text-lg opacity-40">🫓</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-terra-900 truncate">
                      {item.quantity}x {item.productName}
                    </p>
                    {item.optionSelections?.length ? (
                      <p className="text-xs text-terra-400 truncate">
                        {item.optionSelections.flatMap((g) => g.options.map((o) => o.name)).join(', ')}
                      </p>
                    ) : item.extras.length > 0 ? (
                      <p className="text-xs text-terra-400 truncate">+ {item.extras.map(e => e.name).join(', ')}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-terra-700">{formatCurrency(lineTotal)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 border-t border-terra-100 pt-3 space-y-1.5">
            {(deliveryFee > 0 || couponDiscount > 0) && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-terra-500">Subtotal</span>
                  <span className="text-terra-600">{formatCurrency(subtotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-terra-500">Taxa de entrega</span>
                    <span className="text-terra-600">{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">Desconto ({couponCode})</span>
                    <span className="font-medium text-green-600">-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-terra-700">Total</span>
              <span className="font-display text-xl font-semibold text-terra-900">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </motion.div>

        {redeemableProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-terra-700">Resgatar com pontos</h2>
              <span className="flex items-center gap-1 text-xs font-semibold text-terra-600">
                <Award className="h-3.5 w-3.5" />
                {loyaltyBalance} pts
              </span>
            </div>
            <div className="space-y-2">
              {redeemableProducts.map((product) => {
                const isSelected = redeemedItems.includes(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={!product.canRedeem && !isSelected}
                    onClick={() => toggleRedeemItem(product.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-terra-600 bg-cream-warm'
                        : product.canRedeem
                          ? 'border-[#E8DDD0] hover:border-terra-300'
                          : 'border-[#E8DDD0] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {product.imageUrl ? (
                      <img
                        src={getImageUrl(product.imageUrl) ?? ''}
                        alt={product.name}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-terra-100">
                        <Award className="h-4 w-4 text-terra-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-terra-900 truncate">{product.name}</p>
                      <p className="text-xs text-terra-500">{product.redemptionCost} pontos</p>
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terra-600">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h2 className="mb-3 text-sm font-semibold text-terra-700">Forma de pagamento ({isDelivery ? 'Na entrega' : 'No balcão'})</h2>
          <p className="mb-3 text-xs text-terra-500">Você paga quando {isDelivery ? 'o motoboy chegar' : 'retirar no balcão'}.</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2">
            <button
              type="button"
              data-testid="tab-pix"
              onClick={() => setPaymentMethod('pix' as any)}
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-all sm:gap-2 sm:px-4 sm:text-base ${
                paymentMethod === 'pix'
                  ? 'border-terra-600 bg-terra-600 text-white shadow-lg shadow-terra-600/20'
                  : 'border-terra-200 bg-white text-terra-700 hover:border-terra-300'
              }`}
            >
              <QrCode className="h-5 w-5" />
              Pix
            </button>
            <button
              type="button"
              data-testid="tab-cash"
              onClick={() => setPaymentMethod('cash' as any)}
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-all sm:gap-2 sm:px-4 sm:text-base ${
                paymentMethod === 'cash'
                  ? 'border-terra-600 bg-terra-600 text-white shadow-lg shadow-terra-600/20'
                  : 'border-terra-200 bg-white text-terra-700 hover:border-terra-300'
              }`}
            >
              <Banknote className="h-5 w-5" />
              Dinheiro
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              data-testid="tab-card"
              onClick={() => setPaymentMethod('credit_card' as any)}
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-all sm:gap-2 sm:px-4 sm:text-base ${
                paymentMethod === 'credit_card'
                  ? 'border-terra-600 bg-terra-600 text-white shadow-lg shadow-terra-600/20'
                  : 'border-terra-200 bg-white text-terra-700 hover:border-terra-300'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              Cartão de Crédito
            </button>
            <button
              type="button"
              data-testid="tab-debit-card"
              onClick={() => setPaymentMethod('debit_card' as any)}
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-all sm:gap-2 sm:px-4 sm:text-base ${
                paymentMethod === 'debit_card'
                  ? 'border-terra-600 bg-terra-600 text-white shadow-lg shadow-terra-600/20'
                  : 'border-terra-200 bg-white text-terra-700 hover:border-terra-300'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              Cartão de Débito
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
          >
            {error}
          </motion.div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-terra-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur-lg">
        <div className="container">
          {storeClosed ? (
            <button
              type="button"
              disabled
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-terra-300 text-base font-semibold text-white cursor-not-allowed"
            >
              <Clock className="h-5 w-5" />
              Loja fechada
            </button>
          ) : (
            <button
              type="button"
              data-testid="pay-button"
              onClick={handlePay}
              disabled={createOrderPending}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-terra-600 text-base font-semibold text-white shadow-lg shadow-terra-600/20 transition-all hover:bg-terra-700 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {createOrderPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {paymentMethod === 'pix' ? (
                <>
                  <QrCode className="h-5 w-5" />
                  Confirmar — Pagar via Pix {isDelivery ? 'na entrega' : 'no balcão'}
                </>
              ) : paymentMethod === 'debit_card' ? (
                <>
                  <CreditCard className="h-5 w-5" />
                  Confirmar — Pagar no Débito {isDelivery ? 'na entrega' : 'no balcão'}
                </>
              ) : paymentMethod === 'cash' ? (
                <>
                  <Banknote className="h-5 w-5" />
                  Confirmar — Pagar em Dinheiro {isDelivery ? 'na entrega' : 'no balcão'}
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Confirmar — Pagar no Crédito {isDelivery ? 'na entrega' : 'no balcão'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
