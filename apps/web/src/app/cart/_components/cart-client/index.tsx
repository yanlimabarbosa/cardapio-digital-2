'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Minus, Plus, Trash2, MapPin, Store, Loader2, ShoppingBag, User, Phone, MessageSquare, Check, AlertTriangle, ChevronDown, Tag, X, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import { useCartPage } from '../use-cart-page';
import { Field } from './field';
import { useState, useMemo } from 'react';
import { normalizeNeighborhood, type DeliveryAreaResponse } from '@cardapio/shared';
import { SchedulePicker } from '@/components/schedule/schedule-picker';

const inputBase = 'h-11 w-full rounded-xl border bg-white px-4 text-base font-medium text-[#3D2B1F] outline-none transition-colors placeholder:text-[#C4B5A0] focus:ring-2';
const inputOk = `${inputBase} border-[#E8DDD0] focus:border-[#D4C8BA] focus:ring-[#E8DDD0]/50`;
const inputErr = `${inputBase} border-red-300 focus:border-red-400 focus:ring-red-100`;
const inputReadOnly = `${inputBase} border-[#E8DDD0] bg-[#f9e8d8] text-[#8B7355] cursor-not-allowed`;

function NeighborhoodSelect({
  areas,
  onSelect,
  selectedNeighborhood,
  fallbackNeighborhood,
}: {
  areas: DeliveryAreaResponse[];
  onSelect: (area: DeliveryAreaResponse) => void;
  selectedNeighborhood: string;
  fallbackNeighborhood?: string | null;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const selectedArea = useMemo(
    () => areas.find((area) => area.neighborhood === selectedNeighborhood) ?? null,
    [areas, selectedNeighborhood],
  );
  const inputValue = open ? search : selectedArea?.neighborhood ?? '';
  const displayValue = inputValue || fallbackNeighborhood || '';

  const grouped = useMemo(() => {
    const groups: Record<string, DeliveryAreaResponse[]> = {};
    for (const area of areas) {
      if (!groups[area.city]) groups[area.city] = [];
      groups[area.city].push(area);
    }
    return groups;
  }, [areas]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = normalizeNeighborhood(search);
    const result: Record<string, DeliveryAreaResponse[]> = {};
    for (const [city, cityAreas] of Object.entries(grouped)) {
      const matches = cityAreas.filter(
        (a) =>
          normalizeNeighborhood(a.neighborhood).includes(q) ||
          normalizeNeighborhood(a.city).includes(q),
      );
      if (matches.length > 0) result[city] = matches;
    }
    return result;
  }, [grouped, search]);

  function openDropdown() {
    setSearch(selectedArea?.neighborhood ?? '');
    setOpen(true);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onFocus={(event) => {
          openDropdown();
          event.currentTarget.select();
        }}
        onClick={() => {
          if (!open) openDropdown();
        }}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        placeholder="Selecione seu bairro"
        className={`${inputOk} pr-10 ${fallbackNeighborhood && !selectedArea ? 'text-[#8B7355]' : ''}`}
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) {
            setOpen(false);
            setSearch('');
          } else {
            openDropdown();
          }
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C4B5A0]"
        aria-label={open ? 'Fechar bairros' : 'Abrir bairros'}
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[#E8DDD0] bg-white shadow-lg">
          <div className="max-h-60 overflow-auto py-1">
            {Object.entries(filtered).map(([city, cityAreas]) => (
              <div key={city}>
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#8B7355]">{city}</div>
                {cityAreas.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => { onSelect(area); setOpen(false); setSearch(''); }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                      selectedArea?.id === area.id
                        ? 'bg-[#FAF6F1] font-semibold text-[#3D2B1F]'
                        : 'text-[#3D2B1F] hover:bg-[#FAF6F1]'
                    }`}
                  >
                    <span>{area.neighborhood}</span>
                    <span className="text-xs font-semibold text-terra-600">{formatCurrency(area.fee)}</span>
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(filtered).length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-[#C4B5A0]">Nenhum bairro encontrado</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CartClient() {
  const {
    items,
    deliveryType,
    deliveryAddress,
    updateQuantity,
    removeItem,
    loadingCep,
    subtotal,
    deliveryFee,
    totalAmount,
    needsAddress,
    register,
    errors,
    handleSubmit,
    onSubmit,
    handleCepChange,
    handlePhoneChange,
    handleDeliveryTypeChange,
    handleDeliveryAreaSelect,
    cepAutoFilled,
    deliveryAreaError,
    viaCepNeighborhood,
    deliveryAreas,
    canSubmit,
    couponCode,
    couponDiscount,
    couponInput,
    setCouponInput,
    couponError,
    handleApplyCoupon,
    handleRemoveCoupon,
    couponValidating,
    scheduledFor,
    scheduledForLabel,
    scheduleOptions,
    setScheduledFor,
    canOrderNow,
    availabilityIssue,
  } = useCartPage();

  if (items.length === 0) {
    return (
      <main className="order-flow-brown flex min-h-dvh flex-col items-center justify-center bg-cream-warm px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-terra-100">
            <ShoppingBag className="h-10 w-10 text-terra-400" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold text-terra-900">Carrinho vazio</h1>
          <p className="mt-2 text-terra-500">
            Adicione itens do cardápio para continuar
          </p>
          <Link href="/">
            <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-terra-600 px-6 py-3 font-semibold text-white transition-all hover:bg-terra-700 active:scale-[0.98]">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao cardápio
            </button>
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="order-flow-brown min-h-dvh bg-cream-warm pb-36">
      <header className="relative overflow-hidden bg-cocoa-noise px-4 py-4 text-white">
        <div className="absolute inset-0 tapioca-grain opacity-40" />
        <div className="container relative flex items-center gap-3">
          <Link href="/">
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <Link href="/"><img src="/logo.png" alt="Bem Comer Self-Service" className="h-10 w-10 rounded-full object-cover" /></Link>
          <div>
            <h1 className="font-display text-xl font-semibold">Seu Pedido</h1>
            <p className="text-sm text-terra-200">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="container px-4 pt-4 pb-4">
        <div className="space-y-3">
          {items.map((item, idx) => {
            let optionsPrice = 0;
            if (item.optionSelections?.length) {
              optionsPrice = item.optionSelections.reduce((gs, g) => gs + g.options.reduce((os, o) => os + o.price, 0), 0);
            } else {
              optionsPrice = item.extras.reduce((s, e) => s + e.price, 0);
            }
            const lineTotal = (item.unitPrice + optionsPrice) * item.quantity;
            const imgSrc = getImageUrl(item.imageUrl);

            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, type: 'spring', damping: 20 }}
                className="overflow-hidden rounded-xl border border-[#E8DDD0] bg-[#FFFCF8]"
              >
                <div className="flex gap-3 p-3">
                  {imgSrc ? (
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-terra-100">
                      <img src={imgSrc} alt={item.productName} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-terra-100 to-terra-200">
                      <span className="text-2xl opacity-40">🫓</span>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold leading-tight text-terra-900">{item.productName}</h3>
                        <button type="button" onClick={() => removeItem(item.key)} className="shrink-0 rounded-md p-1 text-terra-300 transition-colors hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {item.optionSelections?.length ? (
                        <div className="mt-0.5 space-y-0.5">
                          {item.optionSelections.map((g) => (
                            <p key={g.groupId} className="line-clamp-1 text-xs text-terra-500">
                              <span className="font-medium text-terra-600">{g.groupName}:</span>{' '}
                              {g.options.map((o) => o.name).join(', ')}
                            </p>
                          ))}
                        </div>
                      ) : item.extras.length > 0 ? (
                        <p className="mt-0.5 line-clamp-1 text-sm text-terra-500">+ {item.extras.map((e) => e.name).join(', ')}</p>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-display text-base font-semibold text-terra-600">{formatCurrency(lineTotal)}</span>
                      <div className="flex items-center rounded-lg border border-terra-200">
                        <button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center text-terra-500 transition-colors active:bg-cream-warm">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-terra-900">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center text-terra-500 transition-colors active:bg-cream-warm">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8B7355]">Horário do pedido</h2>
          <div className="rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-4">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#8B7355]">
              <Clock className="h-3.5 w-3.5" />
              Retirada ou entrega
            </label>
            <SchedulePicker
              value={scheduledFor}
              onChange={setScheduledFor}
              options={scheduleOptions}
              selectedLabel={scheduledForLabel}
              allowNow={canOrderNow}
            />
            {scheduledForLabel && (
              <p className="mt-2 text-sm font-semibold text-terra-700">Agendado para {scheduledForLabel}</p>
            )}
            {!canOrderNow && !scheduledForLabel && (
              <p className="mt-2 text-sm font-semibold text-terra-700">Escolha um horário para continuar</p>
            )}
          </div>
        </div>

        {availabilityIssue && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {availabilityIssue}
          </div>
        )}

        <div className="mt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8B7355]">Como deseja receber?</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="delivery-delivery"
              onClick={() => handleDeliveryTypeChange('delivery')}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-semibold transition-all ${
                deliveryType === 'delivery'
                  ? 'border-terra-600 bg-terra-600 text-white shadow-lg shadow-terra-600/20'
                  : 'border-[#E8DDD0] bg-[#FFFCF8] text-[#8B7355] hover:border-[#D4C8BA]'
              }`}
            >
              <MapPin className="h-5 w-5" />
              Entrega
            </button>
            <button
              type="button"
              data-testid="delivery-pickup"
              onClick={() => handleDeliveryTypeChange('pickup')}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-semibold transition-all ${
                deliveryType === 'pickup'
                  ? 'border-terra-600 bg-terra-600 text-white shadow-lg shadow-terra-600/20'
                  : 'border-[#E8DDD0] bg-[#FFFCF8] text-[#8B7355] hover:border-[#D4C8BA]'
              }`}
            >
              <Store className="h-5 w-5" />
              Retirar no local
            </button>
          </div>
        </div>

        {needsAddress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="relative z-20 mt-6 overflow-visible"
          >
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8B7355]">Endereço de entrega</h2>
            <div className="overflow-visible rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-4">
              <div className="space-y-3 overflow-visible">
              <Field label="CEP" error={errors.cep?.message}>
                <div className="flex gap-2">
                  <input
                    data-testid="cep-input"
                    placeholder="00000-000"
                    {...register('cep', { onChange: (e) => handleCepChange(e.target.value) })}
                    maxLength={9}
                    className={errors.cep ? inputErr : inputOk}
                  />
                  {loadingCep && <Loader2 className="h-5 w-5 animate-spin text-terra-400 self-center" />}
                </div>
              </Field>
              <Field label="Rua" error={errors.street?.message} required>
                <input
                  placeholder="Rua / Avenida"
                  {...register('street')}
                  readOnly={cepAutoFilled}
                  className={cepAutoFilled ? inputReadOnly : errors.street ? inputErr : inputOk}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Número" error={errors.number?.message} required>
                  <input
                    data-testid="address-number"
                    placeholder="123"
                    {...register('number')}
                    className={errors.number ? inputErr : inputOk}
                  />
                </Field>
                <Field label="Complemento">
                  <input
                    placeholder="Apto, bloco..."
                    {...register('complement')}
                    className={inputOk}
                  />
                </Field>
              </div>
              <Field label="Bairro" error={errors.neighborhood?.message} required>
                <NeighborhoodSelect
                  areas={deliveryAreas}
                  onSelect={handleDeliveryAreaSelect}
                  selectedNeighborhood={deliveryAddress.neighborhood}
                  fallbackNeighborhood={viaCepNeighborhood}
                />
                <input type="hidden" {...register('neighborhood')} />
              </Field>

              {deliveryAreaError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {deliveryAreaError}
                </div>
              )}

              {deliveryFee > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700">
                  <Check className="h-4 w-4 shrink-0" />
                  Taxa de entrega: {formatCurrency(deliveryFee)}
                </div>
              )}

              <input type="hidden" {...register('city')} />
              <input type="hidden" {...register('state')} />
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8B7355]">Seus dados</h2>
          <div className="space-y-3 rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-4">
            <Field label="Nome" icon={<User className="h-3.5 w-3.5" />} error={errors.customerName?.message} required>
              <input
                data-testid="customer-name"
                placeholder="Nome completo"
                {...register('customerName')}
                className={errors.customerName ? inputErr : inputOk}
              />
            </Field>
            <Field label="Telefone" icon={<Phone className="h-3.5 w-3.5" />} error={errors.customerPhone?.message} required>
              <input
                data-testid="customer-phone"
                placeholder="(83) 99999-9999"
                {...register('customerPhone', { onChange: (e) => handlePhoneChange(e.target.value) })}
                className={errors.customerPhone ? inputErr : inputOk}
              />
            </Field>
            <Field label="Observações" icon={<MessageSquare className="h-3.5 w-3.5" />}>
              <textarea
                placeholder="Sem cebola, ponto da carne..."
                {...register('notes')}
                className="min-h-[80px] w-full resize-none rounded-xl border border-[#E8DDD0] bg-white px-4 py-2.5 text-base font-medium text-[#3D2B1F] outline-none transition-colors placeholder:text-[#C4B5A0] focus:border-[#D4C8BA] focus:ring-2 focus:ring-[#E8DDD0]/50"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8B7355]">Cupom de desconto</h2>
          <div className="space-y-3 rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-4">
            {couponCode ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                  <Tag className="h-4 w-4" />
                  <span>Cupom <strong>{couponCode}</strong> aplicado</span>
                  <span className="text-green-600">(-{formatCurrency(couponDiscount)})</span>
                </div>
                <button type="button" onClick={handleRemoveCoupon} className="rounded-md p-1 text-green-600 transition-colors hover:bg-green-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Código do cupom"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className={`${couponError ? inputErr : inputOk} flex-1 uppercase`}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponValidating || !couponInput.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 disabled:opacity-50"
                >
                  {couponValidating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Aplicar
                </button>
              </div>
            )}
            {couponError && (
              <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {couponError}
              </div>
            )}
          </div>
        </div>

        <input type="hidden" {...register('deliveryType')} />
      </form>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-terra-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur-lg">
        <div className="container">
          {(deliveryFee > 0 || couponDiscount > 0) && (
            <div className="mb-1 space-y-0.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-terra-400">Subtotal</span>
                <span className="text-terra-500">{formatCurrency(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-terra-400">Taxa de entrega</span>
                  <span className="text-terra-500">{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">Desconto ({couponCode})</span>
                  <span className="font-medium text-green-600">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
            </div>
          )}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-base text-terra-500">Total do pedido</span>
            <span className="font-display text-xl font-semibold text-terra-900">{formatCurrency(totalAmount)}</span>
          </div>
          <button
            type="button"
            data-testid="go-to-payment"
            onClick={handleSubmit(onSubmit)}
            disabled={!canSubmit}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-terra-600 font-semibold text-white shadow-lg shadow-terra-600/20 transition-all hover:bg-terra-700 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          >
            Ir para Pagamento
          </button>
        </div>
      </div>
    </main>
  );
}
