'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product, OptionGroup } from '@cardapio/shared';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import { useCartStore, type CartExtra, type CartOptionSelection } from '@/stores/cart-store';
import { Minus, Plus, Check, X, ChevronLeft } from 'lucide-react';

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  storeOpen?: boolean;
}

export function ProductDetailDialog({ product, open, onClose, storeOpen = true }: ProductDetailDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<CartExtra[]>([]);
  const [groupSelections, setGroupSelections] = useState<Record<string, string[]>>({});
  const [imageOpen, setImageOpen] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const close = useCallback(() => {
    setQuantity(1);
    setSelectedExtras([]);
    setGroupSelections({});
    setImageOpen(false);
    onClose();
  }, [onClose]);

  if (!product) return null;

  const isCompound = product.isCompound && product.optionGroups && product.optionGroups.length > 0;
  const displayPrice = product.effectivePrice ?? product.price;
  const imgSrc = getImageUrl(product.imageUrl);

  // Calculate options total for compound products
  const optionsTotal = isCompound
    ? Object.entries(groupSelections).reduce((total, [groupId, optionIds]) => {
        const group = product.optionGroups?.find((g) => g.id === groupId);
        return total + optionIds.reduce((s, oid) => {
          const opt = group?.options.find((o) => o.id === oid);
          return s + (opt?.price ?? 0);
        }, 0);
      }, 0)
    : selectedExtras.reduce((sum, e) => sum + e.price, 0);

  const itemTotal = (displayPrice + optionsTotal) * quantity;
  const hasOptions = isCompound || product.extras.length > 0;

  // Validation: all required groups must be satisfied
  const allRequiredSatisfied = isCompound
    ? product.optionGroups!.filter((g) => g.required).every((g) => (groupSelections[g.id]?.length ?? 0) >= g.minSelections)
    : true;

  function toggleExtra(extra: CartExtra) {
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra],
    );
  }

  function toggleGroupOption(group: OptionGroup, optionId: string) {
    setGroupSelections((prev) => {
      const current = prev[group.id] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      // Single selection (maxSelections === 1): replace
      if (group.maxSelections === 1) {
        return { ...prev, [group.id]: [optionId] };
      }
      // Multi: check max
      if (current.length >= group.maxSelections) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  function handleAdd() {
    if (isCompound) {
      const optionSels: CartOptionSelection[] = (product.optionGroups ?? [])
        .map((g) => ({
          groupId: g.id,
          groupName: g.name,
          options: (groupSelections[g.id] ?? []).map((oid) => {
            const opt = g.options.find((o) => o.id === oid)!;
            return { id: opt.id, name: opt.name, price: opt.price };
          }),
        }))
        .filter((g) => g.options.length > 0);

      addItem(
        {
          productId: product!.id,
          productName: product!.name,
          unitPrice: displayPrice,
          extras: [],
          optionSelections: optionSels,
          isCompound: true,
          imageUrl: product!.imageUrl,
        },
        quantity,
      );
    } else {
      addItem(
        {
          productId: product!.id,
          productName: product!.name,
          unitPrice: displayPrice,
          extras: selectedExtras,
          imageUrl: product!.imageUrl,
        },
        quantity,
      );
    }
    setQuantity(1);
    setSelectedExtras([]);
    setGroupSelections({});
    onClose();
  }

  // ─── Option Groups Section (compound products) ─────
  const optionGroupsSection = isCompound ? (
    <div>
      {product.optionGroups!.map((group, gi) => {
        const selected = groupSelections[group.id] ?? [];
        const isSingle = group.maxSelections === 1;
        const isMaxed = selected.length >= group.maxSelections;

        return (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05, type: 'spring', damping: 24, stiffness: 300 }}
            className={gi > 0 ? 'border-t-[6px] border-terra-100 md:border-t-0 md:border-t md:border-terra-100' : 'border-t-[6px] border-terra-100 md:border-t-0'}
          >
            <div className="px-5 pb-2 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-terra-900">{group.name}</h3>
                  <p className="text-xs text-terra-400">
                    {group.required
                      ? `Escolha ${group.minSelections === group.maxSelections ? `${group.minSelections}` : `${group.minSelections} a ${group.maxSelections}`} opção(ões)`
                      : `Escolha até ${group.maxSelections}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selected.length > 0 && (
                    <span className="text-xs font-semibold text-terra-600">{selected.length}/{group.maxSelections}</span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    group.required
                      ? selected.length >= group.minSelections
                        ? 'bg-green-50 text-green-600'
                        : 'bg-amber-50 text-amber-600'
                      : 'bg-terra-100 text-terra-600'
                  }`}>
                    {group.required ? (selected.length >= group.minSelections ? 'OK' : 'Obrigatório') : 'Opcional'}
                  </span>
                </div>
              </div>
            </div>
            <div className="pb-3">
              {group.options.map((option, idx) => {
                const isSelected = selected.includes(option.id);
                const isDisabled = !isSelected && isMaxed;
                const isLast = idx === group.options.length - 1;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => !isDisabled && toggleGroupOption(group, option.id)}
                    disabled={isDisabled}
                    className={`flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors ${
                      isDisabled ? 'opacity-40' : 'hover:bg-terra-50/50 active:bg-terra-50'
                    } ${!isLast ? 'border-b border-terra-100' : ''}`}
                  >
                    <div className="flex-1 pr-3">
                      <span className="text-sm font-medium text-terra-800">{option.name}</span>
                      {option.price > 0 ? (
                        <p className="text-sm text-terra-500">+ {formatCurrency(option.price)}</p>
                      ) : (
                        <p className="text-xs text-green-600">Incluso</p>
                      )}
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center transition-all ${
                        isSingle
                          ? `rounded-full border-2 ${isSelected ? 'border-terra-600' : 'border-terra-300'}`
                          : `rounded-md border-2 ${isSelected ? 'border-terra-600 bg-terra-600 text-white' : 'border-terra-300'}`
                      }`}
                    >
                      {isSelected && (
                        isSingle
                          ? <div className="h-3 w-3 rounded-full bg-terra-600" />
                          : <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  ) : null;

  // ─── Flat Extras Section (non-compound) ────────────
  const extrasSection = !isCompound && product.extras.length > 0 ? (
    <div className="border-t-[6px] border-terra-100 md:border-t-0">
      <div className="px-5 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-terra-900">Adicionais</h3>
            <p className="text-xs text-terra-400">Escolha quantos quiser</p>
          </div>
          <span className="rounded-full bg-terra-100 px-3 py-1 text-xs font-semibold text-terra-600">
            Opcional
          </span>
        </div>
      </div>
      <div className="pb-3">
        {product.extras.map((extra, idx) => {
          const isSelected = selectedExtras.some((e) => e.id === extra.id);
          const isLast = idx === product.extras.length - 1;
          return (
            <button
              key={extra.id}
              type="button"
              data-testid={`extra-${extra.id}`}
              onClick={() => toggleExtra(extra)}
              className={`flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-terra-50/50 active:bg-terra-50 ${
                !isLast ? 'border-b border-terra-100' : ''
              }`}
            >
              <div className="flex-1 pr-3">
                <span className="text-sm font-medium text-terra-800">{extra.name}</span>
                <p className="text-sm text-terra-500">+ {formatCurrency(extra.price)}</p>
              </div>
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                  isSelected
                    ? 'border-terra-600 bg-terra-600 text-white'
                    : 'border-terra-300'
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  const optionsContent = optionGroupsSection || extrasSection;

  const bottomBar = (
    <div className="shrink-0 border-t border-terra-200 bg-white px-5 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {storeOpen ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-terra-200">
            <button type="button" data-testid="qty-decrease" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center text-terra-600 transition-colors active:bg-terra-50">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-display text-lg font-semibold text-terra-900">{quantity}</span>
            <button type="button" data-testid="qty-increase" onClick={() => setQuantity(quantity + 1)} className="flex h-10 w-10 items-center justify-center text-terra-600 transition-colors active:bg-terra-50">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            data-testid="confirm-add-to-cart"
            onClick={handleAdd}
            disabled={!allRequiredSatisfied}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-extrabold tracking-tight transition-all active:scale-[0.98] ${
              allRequiredSatisfied
                ? 'text-cocoa-800 shadow-butter hover:-translate-y-0.5'
                : 'bg-terra-300 cursor-not-allowed text-white'
            }`}
            style={allRequiredSatisfied ? { backgroundImage: 'linear-gradient(180deg, #FFD953 0%, #F5C518 52%, #E6B000 100%)' } : undefined}
          >
            <span>Adicionar</span>
            <span className="font-display">{formatCurrency(itemTotal)}</span>
          </button>
        </div>
      ) : (
        <button type="button" disabled className="flex h-12 w-full items-center justify-center rounded-lg bg-terra-300 font-semibold text-white cursor-not-allowed">
          Loja fechada
        </button>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={close}
      className={hasOptions ? 'md:h-[min(85vh,680px)] md:max-w-4xl' : 'md:h-auto md:max-h-[90vh] md:max-w-3xl'}
    >
      <button
        type="button"
        onClick={close}
        className="absolute left-3 top-3 z-20 rounded-full bg-white/90 p-2 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg focus:outline-none md:hidden"
      >
        <ChevronLeft className="h-5 w-5 text-terra-800" />
      </button>

      {/* ─── Mobile layout ─── */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {imgSrc ? (
            <div className="relative cursor-pointer" onClick={() => setImageOpen(true)}>
              <img src={imgSrc} alt={product.name} className="aspect-[4/3] w-full object-cover" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-terra-100 to-terra-200">
              <span className="text-6xl opacity-30">🫓</span>
            </div>
          )}
          <div className="px-5 pb-4 pt-5">
            <h2 className="font-display text-2xl font-semibold leading-tight text-terra-900">{product.name}</h2>
            {product.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-terra-500">{product.description}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              {product.promotionActive ? (
                <>
                  <span className="text-base text-terra-400 line-through">{formatCurrency(product.price)}</span>
                  <span className="font-display text-2xl font-semibold text-green-600">{formatCurrency(product.effectivePrice)}</span>
                </>
              ) : (
                <span className="font-display text-2xl font-semibold text-terra-600">{formatCurrency(product.price)}</span>
              )}
            </div>
          </div>
          {optionsContent}
          <div className="h-4" />
        </div>
        {bottomBar}
      </div>

      {/* ─── Desktop layout ─── */}
      {hasOptions ? (
        <div className="hidden h-full md:flex md:flex-row">
          <div className="flex w-[45%] shrink-0 flex-col bg-terra-50">
            {imgSrc ? (
              <div className="relative cursor-pointer" onClick={() => setImageOpen(true)}>
                <img src={imgSrc} alt={product.name} className="aspect-square w-full object-cover" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-terra-50 to-transparent" />
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-terra-100 to-terra-200">
                <span className="text-6xl opacity-30">🫓</span>
              </div>
            )}
            <div className="flex flex-1 flex-col justify-center px-6 pb-6">
              <h2 className="font-display text-3xl font-semibold leading-tight text-terra-900">{product.name}</h2>
              {product.description && (
                <p className="mt-2 text-sm leading-relaxed text-terra-500">{product.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2">
                {product.promotionActive ? (
                  <>
                    <span className="text-lg text-terra-400 line-through">{formatCurrency(product.price)}</span>
                    <span className="font-display text-3xl font-semibold text-green-600">{formatCurrency(product.effectivePrice)}</span>
                  </>
                ) : (
                  <span className="font-display text-3xl font-semibold text-terra-600">{formatCurrency(product.price)}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col border-l border-terra-100 bg-white">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {optionsContent}
              <div className="h-4" />
            </div>
            {bottomBar}
          </div>
        </div>
      ) : (
        <div className="hidden h-auto md:flex md:flex-row">
          {imgSrc ? (
            <div className="relative w-1/2 shrink-0 cursor-pointer" onClick={() => setImageOpen(true)}>
              <img src={imgSrc} alt={product.name} className="h-full w-full rounded-l-2xl object-cover" />
            </div>
          ) : (
            <div className="flex w-1/2 shrink-0 items-center justify-center rounded-l-2xl bg-gradient-to-br from-terra-100 to-terra-200">
              <span className="text-6xl opacity-30">🫓</span>
            </div>
          )}
          <div className="flex flex-1 flex-col justify-between p-6">
            <div>
              <h2 className="font-display text-3xl font-semibold leading-tight text-terra-900">{product.name}</h2>
              {product.description && (
                <p className="mt-2 text-sm leading-relaxed text-terra-500">{product.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2">
                {product.promotionActive ? (
                  <>
                    <span className="text-lg text-terra-400 line-through">{formatCurrency(product.price)}</span>
                    <span className="font-display text-3xl font-semibold text-green-600">{formatCurrency(product.effectivePrice)}</span>
                  </>
                ) : (
                  <span className="font-display text-3xl font-semibold text-terra-600">{formatCurrency(product.price)}</span>
                )}
              </div>
            </div>
            {storeOpen ? (
              <div className="mt-6 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-terra-200">
                  <button type="button" data-testid="qty-decrease" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center text-terra-600 transition-colors active:bg-terra-50">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-display text-lg font-semibold text-terra-900">{quantity}</span>
                  <button type="button" data-testid="qty-increase" onClick={() => setQuantity(quantity + 1)} className="flex h-10 w-10 items-center justify-center text-terra-600 transition-colors active:bg-terra-50">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  data-testid="confirm-add-to-cart"
                  onClick={handleAdd}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-extrabold tracking-tight text-cocoa-800 shadow-butter transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ backgroundImage: 'linear-gradient(180deg, #FFD953 0%, #F5C518 52%, #E6B000 100%)' }}
                >
                  <span>Adicionar</span>
                  <span className="font-display">{formatCurrency(itemTotal)}</span>
                </button>
              </div>
            ) : (
              <button type="button" disabled className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-terra-300 font-semibold text-white cursor-not-allowed">
                Loja fechada
              </button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {imageOpen && imgSrc && (
          <motion.div
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setImageOpen(false)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setImageOpen(false); }}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.img
              src={imgSrc}
              alt={product.name}
              className="max-h-[85%] max-w-[85%] rounded-xl object-contain"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
