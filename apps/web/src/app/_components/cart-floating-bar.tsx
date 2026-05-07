'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCartStore, getTotalItems, getTotalAmount } from '@/stores/cart-store';

export function CartFloatingBar() {
  const items = useCartStore((s) => s.items);
  const totalItems = getTotalItems(items);
  const totalAmount = getTotalAmount(items);

  return (
    <AnimatePresence>
      {totalItems > 0 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <div className="container">
            <Link href="/cart" data-testid="view-cart">
              <motion.div
                className="relative flex w-full items-center justify-between overflow-hidden rounded-2xl px-5 py-4 text-cream-50 shadow-cocoa"
                style={{ backgroundImage: 'linear-gradient(180deg, #5C3511 0%, #4A2810 58%, #3D1F0A 100%)' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 grain-butter pointer-events-none opacity-60" />
                <div className="relative flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5" strokeWidth={2.4} />
                  <motion.span
                    key={totalItems}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-cream-50 text-xs font-extrabold text-[#4A2810]"
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 400 }}
                  >
                    {totalItems}
                  </motion.span>
                </div>
                <span className="relative font-extrabold tracking-tight">Ver Carrinho</span>
                <span className="relative font-display text-lg font-bold">{formatCurrency(totalAmount)}</span>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
