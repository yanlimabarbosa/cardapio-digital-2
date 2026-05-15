'use client';

import Link from 'next/link';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, QrCode, CreditCard, Zap, ShieldCheck, Clock, Award, Check } from 'lucide-react';
import { formatCurrency, maskCpf } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import { PAGBANK_SDK_URL } from '@/lib/payment-provider';
import { PixPayment } from './pix-payment';
import { CreditCardForm } from './credit-card-form';
import { DebitCardForm } from './debit-card-form';
import { useCheckoutPage } from './use-checkout-page';

export function CheckoutClient() {
  const {
    items,
    paymentMethod,
    setPaymentMethod,
    orderId,
    pixData,
    step,
    error,
    totalAmount,
    subtotal,
    deliveryFee,
    deliveryType,
    deliveryAddress,
    scheduledForLabel,
    customerPhoneForPayment,
    couponCode,
    couponDiscount,
    payerEmail,
    setPayerEmail,
    payerCpf,
    setPayerCpf,
    handlePay,
    handleSwitchToPix,
    handleCardSuccess,
    createOrderPending,
    pixPaymentPending,
    storeClosed,
    redeemableProducts,
    redeemedItems,
    toggleRedeemItem,
    loyaltyBalance,
  } = useCheckoutPage();
  const payerInputClass =
    'h-12 w-full rounded-xl border border-[#E8DDD0] bg-white px-4 text-base font-medium text-[#3D2B1F] placeholder-[#C4B5A0] outline-none transition-all focus:border-[#D4C8BA] focus:ring-2 focus:ring-[#E8DDD0]/50 sm:text-sm';

  if (step === 'processing') {
    return (
      <main className="order-flow-brown flex min-h-dvh flex-col items-center justify-center bg-cream-warm px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-terra-100">
            <Loader2 className="h-8 w-8 animate-spin text-terra-600" />
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold text-terra-900">Criando seu pedido...</h2>
          <p className="mt-1 text-sm text-terra-500">Aguarde um momento</p>
        </motion.div>
      </main>
    );
  }

  if (step === 'paying' && pixData && orderId) {
    return (
      <main className="order-flow-brown min-h-dvh bg-cream-warm">
        <header className="relative overflow-hidden bg-cocoa-noise px-4 py-4 text-white">
          <div className="absolute inset-0 tapioca-grain opacity-40" />
          <div className="container relative flex items-center gap-3">
            <Link href="/"><img src="/logo.png" alt="Bem Comer Self-Service" className="h-10 w-10 rounded-full object-cover" /></Link>
            <div>
              <h1 className="font-display text-xl font-semibold">Pagamento via Pix</h1>
              <p className="text-sm text-terra-200">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </header>
        <div className="container px-4 py-6">
          <PixPayment pixData={pixData} orderId={orderId} />
        </div>
      </main>
    );
  }

  if (step === 'paying' && (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && orderId) {
    const isDebit = paymentMethod === 'debit_card';

    return (
      <main className="order-flow-brown min-h-dvh bg-cream-warm">
        <header className="relative overflow-hidden bg-cocoa-noise px-4 py-4 text-white">
          <div className="absolute inset-0 tapioca-grain opacity-40" />
          <div className="container relative flex items-center gap-3">
            <Link href="/"><img src="/logo.png" alt="Bem Comer Self-Service" className="h-10 w-10 rounded-full object-cover" /></Link>
            <div>
              <h1 className="font-display text-xl font-semibold">{isDebit ? 'Pagamento no Débito' : 'Pagamento com Cartão'}</h1>
              <p className="text-sm text-terra-200">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </header>
        <div className="container px-4 py-6">
          <Script src={PAGBANK_SDK_URL} strategy="afterInteractive" />
          {isDebit ? (
            <DebitCardForm
              orderId={orderId}
              totalAmount={totalAmount}
              onSuccess={handleCardSuccess}
              initialEmail={payerEmail}
              initialCpf={payerCpf}
              customerPhone={customerPhoneForPayment}
              deliveryAddress={deliveryType === 'delivery' ? deliveryAddress : undefined}
            />
          ) : (
            <CreditCardForm
              orderId={orderId}
              totalAmount={totalAmount}
              onSuccess={handleCardSuccess}
              initialEmail={payerEmail}
              initialCpf={payerCpf}
            />
          )}
          <div className="mt-6 space-y-3 rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-4">
            <p className="text-center text-sm text-terra-500">Problemas com o cartão?</p>
            <button
              type="button"
              onClick={handleSwitchToPix}
              disabled={pixPaymentPending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-terra-200 font-semibold text-terra-700 transition-all hover:bg-cream-warm disabled:opacity-50"
            >
              {pixPaymentPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <QrCode className="h-4 w-4" />
              Pagar com Pix
            </button>
            <Link href="/">
              <button className="flex h-10 w-full items-center justify-center text-sm text-terra-400 transition-colors hover:text-terra-600">
                Voltar ao cardápio
              </button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
          <h1 className="font-display text-xl font-semibold">Pagamento</h1>
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
          <h2 className="mb-3 text-sm font-semibold text-terra-700">Forma de pagamento</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              data-testid="tab-pix"
              onClick={() => setPaymentMethod('pix')}
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
              data-testid="tab-card"
              onClick={() => setPaymentMethod('credit_card')}
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-all sm:gap-2 sm:px-4 sm:text-base ${
                paymentMethod === 'credit_card'
                  ? 'border-terra-600 bg-terra-600 text-white shadow-lg shadow-terra-600/20'
                  : 'border-terra-200 bg-white text-terra-700 hover:border-terra-300'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              Crédito
            </button>
            <button
              type="button"
              data-testid="tab-debit-card"
              onClick={() => setPaymentMethod('debit_card')}
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-all sm:gap-2 sm:px-4 sm:text-base ${
                paymentMethod === 'debit_card'
                  ? 'border-terra-600 bg-terra-600 text-white shadow-lg shadow-terra-600/20'
                  : 'border-terra-200 bg-white text-terra-700 hover:border-terra-300'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              Débito
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.055 }}
          className="rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-4"
        >
          <h2 className="mb-3 text-sm font-semibold text-terra-700">Dados do pagador</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">
                E-mail
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={payerEmail}
                onChange={(event) => setPayerEmail(event.target.value)}
                required
                className={payerInputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">
                CPF
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={payerCpf}
                onChange={(event) => setPayerCpf(maskCpf(event.target.value))}
                maxLength={14}
                required
                className={payerInputClass}
              />
            </div>
          </div>
        </motion.div>

        <div className="rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] px-4 py-6">
          <AnimatePresence mode="wait">
            {paymentMethod === 'pix' ? (
              <motion.div
                key="pix"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <div className="relative">
                  <div className="absolute -inset-1.5 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border-2 border-green-500/15" />
                  <div className="flex h-14 w-14 animate-[float_3s_ease-in-out_infinite] items-center justify-center rounded-full bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5]">
                    <Zap className="h-6 w-6 fill-green-500 text-green-500" strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-[#3D2B1F]">Pagamento instantâneo</p>
                  <p className="mx-auto mt-1 max-w-[240px] text-xs font-normal text-[#8B7355]">
                    Escaneie o QR Code e seu pedido será confirmado na hora
                  </p>
                </div>
                <div className="flex items-center gap-5 text-xs font-semibold text-green-600">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Seguro</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Imediato</span>
                </div>
              </motion.div>
            ) : paymentMethod === 'credit_card' ? (
              <motion.div
                key="card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <div className="relative">
                  <div className="absolute -inset-1.5 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border-2 border-blue-500/15" />
                  <div className="flex h-14 w-14 animate-[float_3s_ease-in-out_infinite] items-center justify-center rounded-full bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]">
                    <CreditCard className="h-6 w-6 text-blue-500" strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-[#3D2B1F]">Cartão de crédito</p>
                  <p className="mx-auto mt-1 max-w-[240px] text-xs font-normal text-[#8B7355]">
                    Parcele em até 6x sem juros no cartão
                  </p>
                </div>
                <div className="flex items-center gap-5 text-xs font-semibold text-blue-600">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Criptografado</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="debit"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <div className="relative">
                  <div className="absolute -inset-1.5 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border-2 border-purple-500/15" />
                  <div className="flex h-14 w-14 animate-[float_3s_ease-in-out_infinite] items-center justify-center rounded-full bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE]">
                    <CreditCard className="h-6 w-6 text-purple-500" strokeWidth={1.5} />
                  </div>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-[#3D2B1F]">Cartão de débito</p>
                  <p className="mx-auto mt-1 max-w-[240px] text-xs font-normal text-[#8B7355]">
                    Autenticação 3DS com validação do banco emissor
                  </p>
                </div>
                <div className="flex items-center gap-5 text-xs font-semibold text-purple-600">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> 3DS PagBank</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
              disabled={createOrderPending || pixPaymentPending}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-terra-600 text-base font-semibold text-white shadow-lg shadow-terra-600/20 transition-all hover:bg-terra-700 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {(createOrderPending || pixPaymentPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {paymentMethod === 'pix' ? (
                <>
                  <QrCode className="h-5 w-5" />
                  Gerar QR Code Pix — {formatCurrency(totalAmount)}
                </>
              ) : paymentMethod === 'debit_card' ? (
                <>
                  <CreditCard className="h-5 w-5" />
                  Pagar no Débito — {formatCurrency(totalAmount)}
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Pagar no Crédito — {formatCurrency(totalAmount)}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
