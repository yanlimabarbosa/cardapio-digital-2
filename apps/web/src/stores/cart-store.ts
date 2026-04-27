'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartExtra {
  id: string;
  name: string;
  price: number;
}

export interface CartOptionSelection {
  groupId: string;
  groupName: string;
  options: CartExtra[];
}

export interface CartItem {
  key: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  extras: CartExtra[];
  optionSelections?: CartOptionSelection[];
  isCompound?: boolean;
  imageUrl?: string;
}

export interface DeliveryAddress {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface CartState {
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  notes: string;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress: DeliveryAddress;
  deliveryAreaId: string | null;
  deliveryFee: number;
  couponCode: string | null;
  couponDiscount: number;
  setCoupon: (code: string | null, discount: number) => void;
  clearCoupon: () => void;
  addItem: (item: Omit<CartItem, 'key' | 'quantity'>, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  hydrateItems: (freshProducts: Array<{ id: string; name: string; price: number; effectivePrice?: number; imageUrl?: string; extras: CartExtra[] }>) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setNotes: (notes: string) => void;
  setDeliveryType: (type: 'pickup' | 'delivery') => void;
  setDeliveryAddress: (address: Partial<DeliveryAddress>) => void;
  setDeliveryArea: (id: string | null, fee: number) => void;
  clearCart: () => void;
}

function makeKey(productId: string, extras: CartExtra[], optionSelections?: CartOptionSelection[]): string {
  if (optionSelections?.length) {
    const allOptionIds = optionSelections
      .flatMap((g) => g.options.map((o) => o.id))
      .sort()
      .join(',');
    return `${productId}:${allOptionIds}`;
  }
  const extraIds = extras.map((e) => e.id).sort().join(',');
  return `${productId}:${extraIds}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      customerName: '',
      customerPhone: '',
      notes: '',
      deliveryType: 'delivery' as const,
      deliveryAddress: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
      deliveryAreaId: null,
      deliveryFee: 0,
      couponCode: null,
      couponDiscount: 0,

      setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),
      clearCoupon: () => set({ couponCode: null, couponDiscount: 0 }),

      addItem: (item, quantity = 1) =>
        set((state) => {
          const key = makeKey(item.productId, item.extras, item.optionSelections);
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...item, key, quantity }],
          };
        }),

      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((i) => i.key !== key),
        })),

      updateQuantity: (key, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.key !== key) };
          }
          return {
            items: state.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
          };
        }),

      hydrateItems: (freshProducts) =>
        set((state) => {
          const productMap = new Map(freshProducts.map((p) => [p.id, p]));
          const updated: CartItem[] = [];
          for (const item of state.items) {
            const fresh = productMap.get(item.productId);
            if (!fresh) continue; // product removed
            const freshExtras = item.extras
              .map((e) => fresh.extras.find((fe) => fe.id === e.id))
              .filter((e): e is CartExtra => !!e);
            updated.push({
              ...item,
              productName: fresh.name,
              unitPrice: fresh.effectivePrice ?? fresh.price,
              imageUrl: fresh.imageUrl,
              extras: freshExtras,
              key: makeKey(item.productId, freshExtras),
            });
          }
          return { items: updated };
        }),

      setCustomerName: (customerName) => set({ customerName }),
      setCustomerPhone: (customerPhone) => set({ customerPhone }),
      setNotes: (notes) => set({ notes }),
      setDeliveryType: (deliveryType) => set({ deliveryType }),
      setDeliveryAddress: (partial) =>
        set((state) => ({
          deliveryAddress: { ...state.deliveryAddress, ...partial },
        })),
      setDeliveryArea: (id, fee) => set({ deliveryAreaId: id, deliveryFee: fee }),

      clearCart: () =>
        set({
          items: [],
          notes: '',
          deliveryAreaId: null,
          deliveryFee: 0,
          couponCode: null,
          couponDiscount: 0,
        }),
    }),
    {
      name: 'cardapio-cart',
    },
  ),
);

export function getTotalItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getTotalAmount(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    let optionsTotal = 0;
    if (item.optionSelections?.length) {
      optionsTotal = item.optionSelections.reduce(
        (gs, g) => gs + g.options.reduce((os, o) => os + o.price, 0),
        0,
      );
    } else {
      optionsTotal = item.extras.reduce((s, e) => s + e.price, 0);
    }
    return sum + (item.unitPrice + optionsTotal) * item.quantity;
  }, 0);
}
