'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, getTotalAmount } from '@/stores/cart-store';
import { useCustomerStore } from '@/stores/customer-store';
import { useCreateOrder } from '@/hooks/orders/use-create-order';
import { usePixPayment } from '@/hooks/payments/use-pix-payment';
import { useStoreStatus } from '@/hooks/menu/use-store-status';
import { useRedeemableProducts } from '@/hooks/customer/use-redeemable-products';
import { usePruneExpiredScheduledFor } from '@/hooks/menu/use-prune-expired-scheduled-for';
import { useCartHydration } from '@/hooks/menu/use-cart-hydration';
import { getCartAvailabilityIssue } from '@/hooks/menu/cart-availability';
import { isValidCpf, isValidEmail, normalizeEmail } from '@/lib/utils';
import { getPagBankPaymentErrorMessage } from '@/lib/payment-provider';
import { toMetaContents, trackMetaPixel } from '@/lib/meta-pixel';
import { formatScheduledFor, type PaymentMethod, type PixPaymentResponse } from '@cardapio/shared';

export function useCheckoutPage() {
  const router = useRouter();
  const { items, customerName, customerPhone, notes, deliveryType, deliveryAddress, deliveryAreaId, deliveryFee, couponCode, couponDiscount, scheduledFor, clearCart } = useCartStore();
  const customerStore = useCustomerStore();
  const createOrder = useCreateOrder();
  const pixPayment = usePixPayment();
  const { data: storeStatus } = useStoreStatus();
  const { data: redeemableData } = useRedeemableProducts();
  usePruneExpiredScheduledFor();
  const { freshProducts } = useCartHydration();

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card'>('pix');
  const [redeemedItems, setRedeemedItems] = useState<string[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixPaymentResponse | null>(null);
  const [step, setStep] = useState<'select' | 'processing' | 'paying'>('select');
  const [error, setError] = useState<string | null>(null);
  const [savedTotal, setSavedTotal] = useState<number>(0);
  const [payerEmail, setPayerEmail] = useState('');
  const [payerCpf, setPayerCpf] = useState('');

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

  function validatePayer() {
    const normalizedEmail = normalizeEmail(payerEmail);

    if (!normalizedEmail) {
      setError('Informe seu e-mail para continuar.');
      return false;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('Informe um e-mail válido para continuar.');
      return false;
    }
    if (!isValidCpf(payerCpf)) {
      setError('Informe um CPF válido para continuar.');
      return false;
    }
    return true;
  }

  async function handlePay() {
    setError(null);
    if (availabilityIssue) {
      setError(availabilityIssue);
      return;
    }
    if (!validatePayer()) return;
    setStep('processing');

    try {
      const normalizedEmail = normalizeEmail(payerEmail);
      const cpfDigits = payerCpf.replace(/\D/g, '');
      trackMetaPixel('AddPaymentInfo', {
        content_ids: items.map((item) => item.productId),
        content_type: 'product',
        contents: toMetaContents(items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))),
        currency: 'BRL',
        payment_method: paymentMethod,
        value: totalAmount,
      });

      const order = await createOrder.mutateAsync({
        customerName: effectiveName,
        customerPhone: effectivePhone,
        customerEmail: normalizedEmail,
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

      if (paymentMethod === 'pix') {
        const pix = await pixPayment.mutateAsync({
          orderId: order.id,
          payerEmail: normalizedEmail,
          payerTaxId: cpfDigits,
        });
        setPixData(pix);
        setStep('paying');
        clearCart();
      } else {
        setStep('paying');
      }
    } catch (err: any) {
      setError(getCheckoutErrorMessage(err.message, 'Erro ao criar pedido'));
      setStep('select');
    }
  }

  async function handleSwitchToPix() {
    if (!orderId) return;
    setError(null);
    if (!validatePayer()) return;
    try {
      const normalizedEmail = normalizeEmail(payerEmail);
      const cpfDigits = payerCpf.replace(/\D/g, '');

      const pix = await pixPayment.mutateAsync({
        orderId,
        payerEmail: normalizedEmail,
        payerTaxId: cpfDigits,
      });
      setPixData(pix);
      setPaymentMethod('pix');
      clearCart();
    } catch (err: any) {
      setError(getCheckoutErrorMessage(err.message, 'Erro ao gerar Pix'));
    }
  }

  function handleCardSuccess() {
    clearCart();
    router.push(`/order/${orderId}`);
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
    pixData,
    step,
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
    payerEmail,
    setPayerEmail,
    payerCpf,
    setPayerCpf,
    handlePay,
    handleSwitchToPix,
    handleCardSuccess,
    createOrderPending: createOrder.isPending,
    pixPaymentPending: pixPayment.isPending,
    availabilityIssue,
    storeClosed: !scheduledFor && storeStatus?.open === false,
    // Loyalty
    redeemableProducts,
    redeemedItems,
    toggleRedeemItem,
    loyaltyBalance,
  };
}

function getCheckoutErrorMessage(message: string | undefined, fallback: string) {
  const normalized = message?.trim();
  if (!normalized) return fallback;

  const lower = normalized.toLowerCase();
  const looksLikeGatewayError =
    lower.includes('pagbank') ||
    lower.includes('pagseguro') ||
    lower.includes('access_denied') ||
    lower.includes('whitelist') ||
    lower.includes('40002') ||
    lower.includes('charges[') ||
    lower.includes('qr_codes') ||
    lower.includes('payment_method') ||
    lower.includes('transienttoken');

  return looksLikeGatewayError ? getPagBankPaymentErrorMessage(normalized) : normalized;
}
