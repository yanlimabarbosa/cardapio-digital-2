'use client';

import { memo } from 'react';
import type { Product } from '@cardapio/shared';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({ product, onSelect }: ProductCardProps) {
  const imgSrc = getImageUrl(product.imageUrl);
  const unavailable = !product.isActive || product.isAvailable === false;
  const canPreorder = product.isActive && product.isAvailable === false && !!product.nextAvailableAt;
  const unavailableLabel = !product.isActive ? 'Esgotado' : product.availabilityMessage ?? 'Indisponível';
  const disabled = unavailable && !canPreorder;

  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(product)}
      disabled={disabled}
      className={`group flex w-full items-stretch gap-3 rounded-xl border bg-card p-3 text-left shadow-[0_1px_2px_rgba(61,43,31,0.04),0_4px_12px_-6px_rgba(61,43,31,0.1)] transition-all ${
        unavailable
          ? canPreorder
            ? 'cursor-pointer border-cocoa-700/10 opacity-75 hover:-translate-y-0.5 hover:border-butter-400/80 hover:shadow-card-warm active:scale-[0.99]'
            : 'cursor-not-allowed border-cocoa-700/10 opacity-50'
          : 'cursor-pointer border-cocoa-700/12 hover:-translate-y-0.5 hover:border-butter-400/80 hover:shadow-card-warm active:scale-[0.99]'
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="font-display text-[0.95rem] font-semibold leading-snug text-terra-900">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-[0.8rem] leading-relaxed text-terra-800/50">
              {product.description}
            </p>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          {product.promotionActive ? (
            <>
              <span className="text-[0.8rem] text-terra-800/40 line-through">
                {formatCurrency(product.price)}
              </span>
              <span className="font-display text-[0.95rem] font-bold text-green-600">
                {formatCurrency(product.effectivePrice)}
              </span>
            </>
          ) : (
            <span className="inline-flex items-baseline gap-1 font-display text-[0.98rem] font-bold tracking-tight text-cocoa-800">
              <span className="text-[0.68rem] font-semibold text-butter-600 tabular-nums">R$</span>
              <span className="tabular-nums">{formatCurrency(product.price).replace('R$', '').trim()}</span>
            </span>
          )}
          {product.extras.length > 0 && (
            <span className="text-[0.7rem] text-terra-800/40">
              + extras
            </span>
          )}
        </div>
        {unavailable && (
          <p className="mt-1 text-[0.72rem] font-semibold leading-tight text-terra-600">
            {unavailableLabel}
          </p>
        )}
      </div>

      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-terra-100 sm:h-[6.5rem] sm:w-[6.5rem]">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${unavailable ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-terra-50 to-terra-100">
            <span className="text-3xl opacity-30">🫓</span>
          </div>
        )}
        {product.promotionActive && !unavailable && (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-green-500 px-2 py-0.5 text-[0.6rem] font-bold text-white shadow-sm">
            Promo
          </span>
        )}
        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-terra-900/50 backdrop-blur-[1px]">
            <span className="rounded-full bg-terra-900/80 px-2.5 py-1 text-[0.65rem] font-bold text-white">
              {canPreorder ? 'Agendar' : !product.isActive ? 'Esgotado' : 'Indisponível'}
            </span>
          </div>
        )}
      </div>
    </button>
  );
});
