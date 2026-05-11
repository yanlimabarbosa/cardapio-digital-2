import type { Clock } from '../../../../shared/application/clock/clock.port';
import { CouponApplicabilityPolicy } from '../../domain/coupon-applicability.policy';
import { CouponEligibilityPolicy } from '../../domain/coupon-eligibility.policy';
import type { CouponValidationReadRepository } from '../ports/coupon-validation.read-repository.port';

export type ValidateCouponOptionSelectionCommand = {
  readonly groupId: string;
  readonly optionIds: readonly string[];
};

export type ValidateCouponItemCommand = {
  readonly extraIds?: readonly string[];
  readonly optionSelections?: readonly ValidateCouponOptionSelectionCommand[];
  readonly productId: string;
  readonly quantity: number;
};

export type ValidateCouponCommand = {
  readonly code: string;
  readonly customerPhone: string;
  readonly deliveryType: string;
  readonly items: readonly ValidateCouponItemCommand[];
};

export type ValidatedCouponModel = {
  readonly code: string;
  readonly discountType: string;
  readonly discountValue: string;
  readonly id: string;
};

export type ValidateCouponSuccess = {
  readonly calculatedDiscount: number;
  readonly coupon: ValidatedCouponModel;
  readonly eligibleAmount: number;
  readonly valid: true;
};

export type ValidateCouponFailure = {
  readonly reason: string;
  readonly valid: false;
};

export type ValidateCouponResult = ValidateCouponSuccess | ValidateCouponFailure;

export class ValidateCouponUseCase {
  public constructor(
    private readonly coupons: CouponValidationReadRepository,
    private readonly clock: Clock,
  ) {}

  public async execute(command: ValidateCouponCommand): Promise<ValidateCouponResult> {
    const at = this.clock.now();
    const coupon = await this.coupons.findCouponByCode(command.code.toUpperCase());

    if (!coupon) {
      return { valid: false, reason: 'Cupom não encontrado ou inativo' };
    }

    const applicabilityPolicy = CouponApplicabilityPolicy.create(coupon);
    const useValidation = applicabilityPolicy.validateUse({
      at,
      deliveryType: command.deliveryType,
    });
    if (!useValidation.valid) {
      return useValidation;
    }

    const customerContext = await this.coupons.getCustomerContext({
      couponId: coupon.id,
      customerPhone: command.customerPhone,
      countUsage: (coupon.maxUsesPerCustomer ?? 0) > 0,
      countOrders: Boolean(coupon.firstOrderOnly),
    });
    const customerValidation = applicabilityPolicy.validateCustomer(customerContext);
    if (!customerValidation.valid) {
      return customerValidation;
    }

    const products = await this.coupons.findProductsByIds(this.productIds(command.items), at);
    const eligibility = CouponEligibilityPolicy.create(coupon, products).calculate(command.items);
    const orderValidation = applicabilityPolicy.validateEligibleOrder(eligibility);
    if (!orderValidation.valid) {
      return orderValidation;
    }

    const discountCents = applicabilityPolicy.calculateDiscountCents(
      eligibility.eligibleAmountCents,
    );

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      calculatedDiscount: discountCents / 100,
      eligibleAmount: eligibility.eligibleAmountCents / 100,
    };
  }

  private productIds(items: readonly ValidateCouponItemCommand[]): string[] {
    return [...new Set(items.map((item) => item.productId))];
  }
}
