'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCartStore, getTotalAmount } from '@/stores/cart-store';
import { useCustomerStore } from '@/stores/customer-store';
import { useCartHydration } from '@/hooks/menu/use-cart-hydration';
import { useDeliveryAreas } from '@/hooks/menu/use-delivery-areas';
import { useStoreStatus } from '@/hooks/menu/use-store-status';
import { usePruneExpiredScheduledFor } from '@/hooks/menu/use-prune-expired-scheduled-for';
import { useValidateCoupon } from '@/hooks/customer/use-validate-coupon';
import { maskPhone, maskCep } from '@/lib/utils';
import { buildScheduleOptions, formatScheduledFor, normalizeNeighborhood } from '@cardapio/shared';
import type { DeliveryAreaResponse } from '@cardapio/shared';
import { getCartAvailabilityIssue } from '@/hooks/menu/cart-availability';

const baseSchema = z.object({
  customerName: z.string().min(2, 'Informe seu nome'),
  customerPhone: z.string().min(14, 'Telefone inválido'),
  notes: z.string().optional(),
  deliveryType: z.enum(['pickup', 'delivery']),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.deliveryType === 'delivery') {
    if (!data.cep || data.cep.replace(/\D/g, '').length < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CEP inválido', path: ['cep'] });
    }
    if (!data.street || data.street.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a rua', path: ['street'] });
    }
    if (!data.number || data.number.length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o número', path: ['number'] });
    }
    if (!data.neighborhood || data.neighborhood.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o bairro', path: ['neighborhood'] });
    }
  }
});

export type CartFormData = z.infer<typeof baseSchema>;

export function useCartPage() {
  const router = useRouter();
  const {
    items,
    customerName,
    customerPhone,
    notes,
    deliveryType,
    deliveryAddress,
    deliveryAreaId,
    deliveryFee,
    updateQuantity,
    removeItem,
    setCustomerName,
    setCustomerPhone,
    setNotes,
    setDeliveryType,
    setDeliveryAddress,
    setDeliveryArea,
    couponCode,
    couponDiscount,
    scheduledFor,
    setCoupon,
    clearCoupon,
    setScheduledFor,
  } = useCartStore();
  const customerStore = useCustomerStore();
  usePruneExpiredScheduledFor();

  const { isHydrating, freshProducts } = useCartHydration();
  const { data: deliveryAreas } = useDeliveryAreas();
  const { data: storeStatus } = useStoreStatus();
  const validateCoupon = useValidateCoupon();
  const [loadingCep, setLoadingCep] = useState(false);
  const [couponInput, setCouponInput] = useState(couponCode ?? '');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [deliveryAreaError, setDeliveryAreaError] = useState<string | null>(null);
  const [cepAutoFilled, setCepAutoFilled] = useState(false);
  const [showNeighborhoodSelect, setShowNeighborhoodSelect] = useState(false);

  const subtotal = getTotalAmount(items);
  const effectiveFee = deliveryType === 'delivery' && deliveryAreaId ? deliveryFee : 0;
  const effectiveDiscount = couponCode ? couponDiscount : 0;
  const totalAmount = Math.max(0, subtotal + effectiveFee - effectiveDiscount);
  const needsAddress = deliveryType === 'delivery';
  const scheduleOptions = getNextSessionOptions(
    buildScheduleOptions(storeStatus?.weeklySchedule, new Date(), { intervalMinutes: 60, maxDays: 7, limit: 80 }),
  );
  const scheduledForLabel = formatScheduledFor(scheduledFor);
  const canOrderNow = storeStatus?.open !== false;
  const availabilityIssue = useMemo(
    () => getCartAvailabilityIssue(items, freshProducts, scheduledFor),
    [items, freshProducts, scheduledFor],
  );

  const form = useForm<CartFormData>({
    resolver: zodResolver(baseSchema),
    mode: 'onTouched',
    defaultValues: {
      customerName,
      customerPhone,
      notes: notes || '',
      deliveryType,
      cep: deliveryAddress.cep,
      street: deliveryAddress.street,
      number: deliveryAddress.number,
      complement: deliveryAddress.complement,
      neighborhood: deliveryAddress.neighborhood,
      city: deliveryAddress.city,
      state: deliveryAddress.state,
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger, reset } = form;

  // Sync persisted store values into form after Zustand hydrates from localStorage
  const didSync = useRef(false);
  useEffect(() => {
    if (didSync.current) return;
    // Pre-fill name/phone from customer store if available
    const effectiveName = customerName || customerStore.name || '';
    const effectivePhone = customerPhone || (customerStore.phone ? maskPhone(customerStore.phone) : '');
    const hasData = effectiveName || effectivePhone || deliveryAddress.cep || deliveryAddress.street;
    if (!hasData) return;
    didSync.current = true;
    const maskedPhone = maskPhone(effectivePhone);
    if (effectiveName && !customerName) setCustomerName(effectiveName);
    if (effectivePhone && !customerPhone) setCustomerPhone(maskedPhone);
    reset({
      customerName: effectiveName,
      customerPhone: maskedPhone,
      notes: notes || '',
      deliveryType,
      cep: deliveryAddress.cep,
      street: deliveryAddress.street,
      number: deliveryAddress.number,
      complement: deliveryAddress.complement,
      neighborhood: deliveryAddress.neighborhood,
      city: deliveryAddress.city,
      state: deliveryAddress.state,
    });
    const cep = deliveryAddress.cep.replace(/\D/g, '');
    if (cep.length === 8 && !deliveryAddress.street) {
      // CEP filled but street empty — fetch from ViaCEP
      fetchCep(deliveryAddress.cep);
    } else if (deliveryAreaId && deliveryAddress.neighborhood) {
      // Already had a delivery area selected — restore locked state
      setCepAutoFilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerName, customerPhone, deliveryAddress, deliveryType, notes]);

  // When delivery areas load, match persisted address if no area is selected yet
  const didMatchArea = useRef(false);
  useEffect(() => {
    if (didMatchArea.current || !deliveryAreas || deliveryAreaId) return;
    if (deliveryType !== 'delivery' || !deliveryAddress.neighborhood || !deliveryAddress.city) return;
    didMatchArea.current = true;
    const matched = findDeliveryArea(deliveryAddress.city, deliveryAddress.neighborhood);
    if (matched) {
      setDeliveryArea(matched.id, matched.fee);
      setCepAutoFilled(true);
    } else if (deliveryAddress.cep.replace(/\D/g, '').length === 8) {
      setDeliveryAreaError('Não entregamos nesse bairro');
      setCepAutoFilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryAreas, deliveryAreaId, deliveryType, deliveryAddress.neighborhood]);

  // Sync delivery type changes with form
  const watchDeliveryType = watch('deliveryType');
  useEffect(() => {
    if (watchDeliveryType !== deliveryType) {
      setDeliveryType(watchDeliveryType);
    }
  }, [watchDeliveryType, deliveryType, setDeliveryType]);

  function findDeliveryArea(city: string, neighborhood: string): DeliveryAreaResponse | null {
    if (!deliveryAreas) return null;
    const key = normalizeNeighborhood(city + ' ' + neighborhood);
    return deliveryAreas.find((area) => area.normalizedKey === key) ?? null;
  }

  async function fetchCep(rawValue: string) {
    const cep = rawValue.replace(/\D/g, '');
    if (cep.length !== 8) return;
    const maskedCep = maskCep(rawValue);

    setLoadingCep(true);
    setDeliveryAreaError(null);
    setDeliveryArea(null, 0);
    setCepAutoFilled(false);
    setShowNeighborhoodSelect(false);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();

      if (!data.erro && data.localidade) {
        const fields = {
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        };
        setValue('street', fields.street);
        setValue('neighborhood', fields.neighborhood);
        setValue('city', fields.city);
        setValue('state', fields.state);
        setDeliveryAddress({ cep: maskedCep, ...fields });

        if (fields.neighborhood && fields.city) {
          const matched = findDeliveryArea(fields.city, fields.neighborhood);
          if (matched) {
            setDeliveryArea(matched.id, matched.fee);
            setCepAutoFilled(true);
          } else {
            setDeliveryAreaError('Não entregamos nesse bairro');
            setCepAutoFilled(true);
          }
        } else {
          // ViaCEP returned no bairro — show combobox
          setShowNeighborhoodSelect(true);
        }

        if (fields.street) trigger('street');
        if (fields.neighborhood) trigger('neighborhood');
      } else {
        // CEP not found in ViaCEP — show combobox fallback
        setShowNeighborhoodSelect(true);
      }
    } catch {
      // Network failure — show combobox fallback
      setShowNeighborhoodSelect(true);
    }
    setLoadingCep(false);
  }

  function handleCepChange(value: string) {
    const masked = maskCep(value);
    setValue('cep', masked);

    // Reset delivery area state when CEP changes
    if (cepAutoFilled || deliveryAreaError || showNeighborhoodSelect) {
      setCepAutoFilled(false);
      setDeliveryAreaError(null);
      setShowNeighborhoodSelect(false);
      setDeliveryArea(null, 0);
      // Clear autofilled fields
      setValue('street', '');
      setValue('neighborhood', '');
      setValue('city', '');
      setValue('state', '');
    }

    if (masked.replace(/\D/g, '').length === 8) {
      fetchCep(masked);
    }
  }

  function handleDeliveryAreaSelect(area: DeliveryAreaResponse) {
    setDeliveryArea(area.id, area.fee);
    setValue('neighborhood', area.neighborhood);
    setValue('city', area.city);
    setDeliveryAddress({ neighborhood: area.neighborhood, city: area.city });
    setDeliveryAreaError(null);
    setShowNeighborhoodSelect(false);
    trigger('neighborhood');
  }

  function handlePhoneChange(value: string) {
    const masked = maskPhone(value);
    setValue('customerPhone', masked);
  }

  function handleNumberChange(value: string) {
    setValue('number', value);
  }

  function handleStreetChange(value: string) {
    setValue('street', value);
  }

  function handleNeighborhoodChange(value: string) {
    setValue('neighborhood', value);
  }

  function handleNameChange(value: string) {
    setValue('customerName', value);
  }

  function handleNotesChange(value: string) {
    setValue('notes', value);
  }

  function handleComplementChange(value: string) {
    setValue('complement', value);
  }

  function handleDeliveryTypeChange(type: 'pickup' | 'delivery') {
    setValue('deliveryType', type);
    setDeliveryType(type);
    if (type === 'pickup') {
      setDeliveryArea(null, 0);
      setDeliveryAreaError(null);
    }
  }

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponError(null);
    try {
      const phone = (customerStore.phone || customerPhone || '').replace(/\D/g, '');
      const result = await validateCoupon.mutateAsync({
        code,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          extraIds: i.isCompound ? undefined : i.extras.map((e) => e.id),
          optionSelections: i.optionSelections?.length
            ? i.optionSelections.map((g) => ({
                groupId: g.groupId,
                optionIds: g.options.map((o) => o.id),
              }))
            : undefined,
        })) as any,
        deliveryType,
        customerPhone: phone,
      });
      if (result.valid && result.discount != null) {
        setCoupon(code, result.discount);
        setCouponError(null);
      } else {
        setCouponError(result.reason || 'Cupom inválido');
        clearCoupon();
      }
    } catch (err: any) {
      setCouponError(err.message || 'Erro ao validar cupom');
      clearCoupon();
    }
  }

  function handleRemoveCoupon() {
    clearCoupon();
    setCouponInput('');
    setCouponError(null);
  }

  const canSubmit =
    (deliveryType === 'pickup' || (deliveryAreaId != null && !deliveryAreaError)) &&
    (canOrderNow || !!scheduledFor) &&
    !availabilityIssue;

  function syncFormToCart(data: CartFormData) {
    setCustomerName(data.customerName);
    setCustomerPhone(data.customerPhone);
    setNotes(data.notes ?? '');
    setDeliveryType(data.deliveryType);
    setDeliveryAddress({
      cep: data.cep ?? '',
      street: data.street ?? '',
      number: data.number ?? '',
      complement: data.complement ?? '',
      neighborhood: data.neighborhood ?? '',
      city: data.city ?? '',
      state: data.state ?? '',
    });
  }

  function onSubmit(data: CartFormData) {
    if (!canSubmit) return;
    syncFormToCart(data);
    router.push('/checkout');
  }

  return {
    items,
    isHydrating,
    deliveryType,
    deliveryAddress,
    updateQuantity,
    removeItem,
    loadingCep,
    subtotal,
    deliveryFee: effectiveFee,
    totalAmount,
    needsAddress,
    register,
    errors,
    handleSubmit,
    onSubmit,
    handleCepChange,
    handlePhoneChange,
    handleNameChange,
    handleNotesChange,
    handleNumberChange,
    handleStreetChange,
    handleNeighborhoodChange,
    handleComplementChange,
    handleDeliveryTypeChange,
    handleDeliveryAreaSelect,
    watch,
    // Delivery area state
    deliveryAreaError,
    cepAutoFilled,
    showNeighborhoodSelect,
    deliveryAreas: deliveryAreas ?? [],
    canSubmit,
    // Coupon state
    couponCode,
    couponDiscount: effectiveDiscount,
    couponInput,
    setCouponInput,
    couponError,
    handleApplyCoupon,
    handleRemoveCoupon,
    couponValidating: validateCoupon.isPending,
    scheduledFor,
    scheduledForLabel,
    scheduleOptions,
    setScheduledFor,
    canOrderNow,
    availabilityIssue,
  };
}

function getNextSessionOptions<T extends { value: string }>(options: T[]): T[] {
  const first = options[0];
  if (!first) return [];
  const firstDay = getRecifeDateKey(first.value);
  return options.filter((option) => getRecifeDateKey(option.value) === firstDay);
}

function getRecifeDateKey(value: string): string {
  const values: Record<string, string> = {};
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  for (const part of formatter.formatToParts(new Date(value))) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return `${values.year}-${values.month}-${values.day}`;
}
