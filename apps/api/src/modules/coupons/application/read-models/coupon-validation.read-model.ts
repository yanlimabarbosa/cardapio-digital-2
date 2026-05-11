import type { CouponApplicabilityInput } from '../../domain/coupon-applicability.policy';
import type {
  CouponEligibilityCouponInput,
  CouponEligibilityProductInput,
} from '../../domain/coupon-eligibility.policy';

export type CouponValidationCouponReadModel = CouponApplicabilityInput &
  CouponEligibilityCouponInput & {
    readonly code: string;
    readonly id: string;
  };

export type CouponValidationCustomerContextReadModel = {
  readonly customerOrderCount: number | null;
  readonly customerUsageCount: number | null;
};

export type CouponValidationProductReadModel = CouponEligibilityProductInput;
