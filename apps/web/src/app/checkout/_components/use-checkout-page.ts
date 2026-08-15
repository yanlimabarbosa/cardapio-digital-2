'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, getTotalAmount } from '@/stores/cart-store';
import { useCustomerStore } from '@/stores/customer-store';
import { useCreateOrder } from '@/hooks/orders/use-create-order';
import { useStoreStatus } from '@/hooks/menu/use-store-status';
import { useRedeemableProducts } from '@/hooks/customer/use-redeemable-products';
import { usePruneExpiredScheduledFor } from '@/hooks/menu/use-prune-expired-scheduled-for';
import { useCartHydration } from '@/hooks/menu/use-cart-hydration';
import { getCartAvailabilityIssue } from '@/hooks/menu/cart-availability';
import { formatScheduledFor, type PaymentMethod } from '@cardapio/shared';

export function useCheckoutPage() {
  const router = useRouter();
  const { items, customerName, customerPhone, notes, deliveryType, deliveryAddress, deliveryAreaId, deliveryFee, couponCode, couponDiscount, scheduledFor, clearCart } = useCartStore();
  const customerStore = useCustomerStore();
  const createOrder = useCreateOrder();
  const { data: storeStatus } = useStoreStatus();
  const { data: redeemableData } = useRedeemableProducts();
  usePruneExpiredScheduledFor();
  const { freshProducts } = useCartHydration();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix' as PaymentMethod);
  const [redeemedItems, setRedeemedItems] = useState<string[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedTotal, setSavedTotal] = useState<number>(0);

  const effectiveFee = deliveryType === 'delivery' ? deliveryFee : 0;
  const effectiveDiscount = couponCode ? couponDiscount : 0;
  const subtotal = getTotalAmount(items);
  const totalAmount = savedTotal || Math.max(0, subtotal + effectiveFee - effectiveDiscount);
  const availabilityIssue = useMemo(
    () => getCartAvailabilityIssue(items, freshProducts, scheduledFor),
    [items, freshProducts, scheduledFor],
  );

  // Use customer store name/phone if available, fallback to cart store
  const effectiveName = customerStore.name || customerName || '';
  const effectivePhone = (customerStore.phone || customerPhone || '').replace(/\D/g, '');

  useEffect(() => {
    if (items.length === 0 && !orderId) {
      router.push('/cart');
    }
  }, [items, orderId, router]);

  async function handlePay() {
    setError(null);
    if (availabilityIssue) {
      setError(availabilityIssue);
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        customerName: effectiveName,
        customerPhone: effectivePhone,
        paymentMethod: paymentMethod as PaymentMethod,
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? {
          cep: deliveryAddress.cep,
          street: deliveryAddress.street,
          number: deliveryAddress.number,
          complement: deliveryAddress.complement || undefined,
          neighborhood: deliveryAddress.neighborhood,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
        } : undefined,
        deliveryAreaId: deliveryType === 'delivery' ? deliveryAreaId ?? undefined : undefined,
        notes: notes || undefined,
        couponCode: couponCode || undefined,
        scheduledFor: scheduledFor || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          extraIds: item.isCompound ? undefined : item.extras.map((e) => e.id),
          optionSelections: item.optionSelections?.length
            ? item.optionSelections.map((g) => ({
                groupId: g.groupId,
                optionIds: g.options.map((o) => o.id),
              }))
            : undefined,
        })),
        redeemedItems: redeemedItems.length > 0 ? redeemedItems.map((id) => ({ productId: id })) : undefined,
      });

      // Save customer token from response if returned
      if ((order as any).customerToken && !customerStore.token) {
        customerStore.setCustomer((order as any).customerToken, {
          name: effectiveName,
          phone: effectivePhone,
          hasPassword: false,
          loyaltyPoints: 0,
        });
      }

      setOrderId(order.id);
      setSavedTotal(Number(order.totalAmount));

      clearCart();
      router.push(`/order/${order.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar pedido');
    }
  }

  function toggleRedeemItem(productId: string) {
    setRedeemedItems((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  }

  const redeemableProducts = redeemableData?.products ?? [];
  const loyaltyBalance = redeemableData?.balance ?? customerStore.loyaltyPoints;

  return {
    items,
    paymentMethod,
    setPaymentMethod,
    orderId,
    error,
    subtotal,
    totalAmount,
    deliveryFee: effectiveFee,
    deliveryType,
    deliveryAddress,
    scheduledFor,
    scheduledForLabel: formatScheduledFor(scheduledFor),
    customerPhoneForPayment: effectivePhone,
    couponCode,
    couponDiscount: effectiveDiscount,
    handlePay,
    createOrderPending: createOrder.isPending,
    availabilityIssue,
    storeClosed: !scheduledFor && storeStatus?.open === false,
    // Loyalty
    redeemableProducts,
    redeemedItems,
    toggleRedeemItem,
    loyaltyBalance,
  };
}
