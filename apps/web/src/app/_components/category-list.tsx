'use client';

import { useState, useRef, useCallback, useEffect, useTransition } from 'react';
import { animate } from 'framer-motion';
import type { Category, Product } from '@cardapio/shared';
import type { PublicSection } from '@/hooks/menu/use-sections';
import { ProductCard } from './product-card';
import { ProductDetailDialog } from './product-detail-dialog';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import { cn } from '@/lib/utils';

interface CategoryListProps {
  categories: Category[];
  sections?: PublicSection[];
  storeOpen?: boolean;
}

export function CategoryList({ categories, sections, storeOpen = true }: CategoryListProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');
  const [, startTransition] = useTransition();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const isScrollingTo = useRef(false);

  const activeSections = (sections ?? []).filter((s) => s.products.length > 0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingTo.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-category-id');
            if (id) {
              startTransition(() => setActiveCategory(id));
              // Auto-scroll horizontal nav so active pill is visible.
              // `behavior: 'auto'` = instant — no smooth anim that could feel locky
              // during fast page scroll. Affects only the nav container, never window.
              const nav = navRef.current;
              const btn = nav?.querySelector(`[data-nav-id="${id}"]`) as HTMLElement | null;
              if (nav && btn) {
                const target = btn.offsetLeft - nav.clientWidth / 2 + btn.clientWidth / 2;
                nav.scrollTo({ left: target, behavior: 'auto' });
              }
            }
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    const elems = Object.values(sectionRefs.current).filter(Boolean) as HTMLElement[];
    elems.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  const scrollToCategory = useCallback((categoryId: string) => {
    startTransition(() => setActiveCategory(categoryId));
    isScrollingTo.current = true;
    const el = sectionRefs.current[categoryId];
    if (!el) return;
    const target = el.getBoundingClientRect().top + window.scrollY - 64;
    animate(window.scrollY, target, {
      duration: 0.4,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => window.scrollTo(0, v),
      onComplete: () => { setTimeout(() => { isScrollingTo.current = false; }, 100); },
    });
  }, []);

  function handleSelectProduct(product: Product) {
    if (!product.isActive) return;
    setSelectedProduct(product);
    setDialogOpen(true);
  }

  return (
    <>
      {activeSections.map((section) => (
        <div key={section.id} className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            {section.emoji && <span className="text-base">{section.emoji}</span>}
            <h2 className="font-display text-lg font-semibold text-cocoa-700">{section.label}</h2>
            <span className="h-px flex-1 bg-gradient-to-r from-butter-400/40 via-butter-400/10 to-transparent" />
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {section.products.map((product) => {
              const imgSrc = getImageUrl(product.imageUrl);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className="group w-[10rem] shrink-0 overflow-hidden rounded-xl border border-terra-200/60 bg-white shadow-sm transition-all hover:border-terra-300 hover:shadow-md active:scale-[0.98] sm:w-[11.5rem]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-terra-100">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-terra-50 to-terra-100">
                        <span className="text-3xl opacity-30">🫓</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h3 className="truncate text-[0.82rem] font-semibold leading-tight text-terra-900">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="mt-0.5 line-clamp-1 text-[0.7rem] text-terra-400">
                        {product.description}
                      </p>
                    )}
                    <p className="mt-1.5 font-display text-[0.85rem] font-semibold text-terra-600">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="sticky top-0 z-10 -mx-4 border-b border-butter-400/30 bg-cream-50/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-cream-50/85">
        <div ref={navRef} className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-nav-id={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              aria-pressed={activeCategory === cat.id}
              className={cn(
                'group relative shrink-0 rounded-full px-3.5 py-1.5 text-xs transition-all duration-200 will-change-transform sm:px-4 sm:py-2 sm:text-sm',
                activeCategory === cat.id
                  ? 'text-butter-300 font-bold shadow-[inset_0_1px_0_rgba(255,217,83,0.18),inset_0_-1px_0_rgba(20,10,3,0.4)]'
                  : 'border border-cocoa-700/12 bg-cream-100/70 font-semibold text-cocoa-700 hover:border-cocoa-700/25 hover:bg-butter-100/60',
              )}
              style={
                activeCategory === cat.id
                  ? { backgroundImage: 'linear-gradient(180deg, #6B3E14 0%, #4A2810 60%, #3D1F0A 100%)' }
                  : undefined
              }
            >
              <span className="relative" style={activeCategory === cat.id ? { textShadow: '0 1px 0 rgba(20,10,3,0.35)' } : undefined}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-8">
        {categories.map((cat) => (
          <section
            key={cat.id}
            ref={(el) => { sectionRefs.current[cat.id] = el; }}
            data-category-id={cat.id}
            className="scroll-mt-16"
          >
            <div className="mb-4 flex gap-3">
              <span className="w-[3px] shrink-0 self-stretch rounded-full bg-butter-400" aria-hidden />
              <div className="min-w-0">
                <h2 className="font-display text-[1.4rem] font-bold leading-tight text-cocoa-800 tracking-tight">{cat.name}</h2>
                {cat.description && (
                  <p className="mt-1 text-[0.8rem] font-medium text-cocoa-500/75">{cat.description}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {cat.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={handleSelectProduct}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <ProductDetailDialog
        product={selectedProduct}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        storeOpen={storeOpen}
      />
    </>
  );
}
