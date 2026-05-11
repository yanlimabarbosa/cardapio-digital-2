export interface CouponApplicabilityInput {
  readonly isActive?: boolean | null;
  readonly validFrom?: Date | null;
  readonly validUntil?: Date | null;
  readonly validDays?: readonly number[] | null;
  readonly validTimeFrom?: string | null;
  readonly validTimeTo?: string | null;
  readonly deliveryTypeRestriction?: string | null;
  readonly maxUses?: number | null;
  readonly currentUses?: number | null;
  readonly maxUsesPerCustomer?: number | null;
  readonly firstOrderOnly?: boolean | null;
  readonly minQuantity?: number | null;
  readonly minOrderAmount?: string | null;
  readonly discountType: string;
  readonly discountValue: string;
  readonly maxDiscount?: string | null;
}

export interface CouponUseContext {
  readonly at: Date;
  readonly deliveryType: string;
}

export interface CouponCustomerContext {
  readonly customerUsageCount?: number | null;
  readonly customerOrderCount?: number | null;
}

export interface EligibleOrderContext {
  readonly eligibleAmountCents: number;
  readonly eligibleQuantity: number;
}

export interface CouponAllowed {
  readonly valid: true;
}

export interface CouponRejected {
  readonly valid: false;
  readonly reason: string;
}

export type CouponPolicyResult = CouponAllowed | CouponRejected;

export class CouponApplicabilityPolicy {
  private constructor(private readonly coupon: CouponApplicabilityInput) {}

  public static create(coupon: CouponApplicabilityInput): CouponApplicabilityPolicy {
    return new CouponApplicabilityPolicy(coupon);
  }

  public validateUse(context: CouponUseContext): CouponPolicyResult {
    this.assertValidDate(context.at);

    if (!this.coupon.isActive) {
      return this.reject('Cupom não encontrado ou inativo');
    }

    if (this.coupon.validFrom && context.at < this.coupon.validFrom) {
      return this.reject('Cupom ainda não está válido');
    }

    if (this.coupon.validUntil && context.at > this.coupon.validUntil) {
      return this.reject('Cupom expirado');
    }

    if (this.coupon.validDays && this.coupon.validDays.length > 0 && !this.coupon.validDays.includes(context.at.getDay())) {
      return this.reject('Cupom não válido para este dia da semana');
    }

    const currentTime = this.currentTime(context.at);
    if (this.coupon.validTimeFrom && currentTime < this.coupon.validTimeFrom) {
      return this.reject('Cupom não válido neste horário');
    }

    if (this.coupon.validTimeTo && currentTime > this.coupon.validTimeTo) {
      return this.reject('Cupom não válido neste horário');
    }

    if (this.coupon.deliveryTypeRestriction && this.coupon.deliveryTypeRestriction !== context.deliveryType) {
      const label = this.coupon.deliveryTypeRestriction === 'delivery' ? 'entrega' : 'retirada';
      return this.reject(`Cupom válido apenas para ${label}`);
    }

    const maxUses = this.coupon.maxUses ?? 0;
    const currentUses = this.coupon.currentUses ?? 0;
    if (maxUses > 0 && currentUses >= maxUses) {
      return this.reject('Cupom atingiu o limite de usos');
    }

    return { valid: true };
  }

  public validateCustomer(context: CouponCustomerContext): CouponPolicyResult {
    const maxUsesPerCustomer = this.coupon.maxUsesPerCustomer ?? 0;
    const customerUsageCount = context.customerUsageCount ?? 0;
    if (maxUsesPerCustomer > 0 && customerUsageCount >= maxUsesPerCustomer) {
      return this.reject('Você já atingiu o limite de uso deste cupom');
    }

    const customerOrderCount = context.customerOrderCount ?? 0;
    if (this.coupon.firstOrderOnly && customerOrderCount > 0) {
      return this.reject('Cupom válido apenas para o primeiro pedido');
    }

    return { valid: true };
  }

  public validateEligibleOrder(context: EligibleOrderContext): CouponPolicyResult {
    const minQuantity = this.coupon.minQuantity ?? 0;
    if (minQuantity > 0 && context.eligibleQuantity < minQuantity) {
      return this.reject(`Quantidade mínima de ${minQuantity} itens elegíveis não atingida`);
    }

    const minAmount = this.parseMoney(this.coupon.minOrderAmount);
    const eligibleAmount = context.eligibleAmountCents / 100;
    if (minAmount > 0 && eligibleAmount < minAmount) {
      return this.reject(`Valor mínimo de R$${minAmount.toFixed(2)} em itens elegíveis não atingido`);
    }

    if (this.calculateDiscountCents(context.eligibleAmountCents) <= 0) {
      return this.reject('Nenhum item elegível para desconto');
    }

    return { valid: true };
  }

  public calculateDiscountCents(eligibleAmountCents: number): number {
    const discountValue = this.parseMoney(this.coupon.discountValue);
    const rawDiscountCents = this.coupon.discountType === 'percentage'
      ? Math.round(eligibleAmountCents * (discountValue / 100))
      : Math.round(discountValue * 100);

    const maxDiscountCents = this.coupon.maxDiscount
      ? Math.round(this.parseMoney(this.coupon.maxDiscount) * 100)
      : null;
    const cappedDiscountCents = maxDiscountCents === null
      ? rawDiscountCents
      : Math.min(rawDiscountCents, maxDiscountCents);

    return Math.min(cappedDiscountCents, eligibleAmountCents);
  }

  private reject(reason: string): CouponRejected {
    return {
      valid: false,
      reason,
    };
  }

  private currentTime(at: Date): string {
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  }

  private parseMoney(value: string | null | undefined): number {
    return parseFloat(value ?? '0');
  }

  private assertValidDate(at: Date): void {
    if (Number.isNaN(at.getTime())) {
      throw new Error('Coupon applicability requires a valid date');
    }
  }
}
