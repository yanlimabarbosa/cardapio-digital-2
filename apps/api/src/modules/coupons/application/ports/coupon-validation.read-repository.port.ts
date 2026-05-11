import type {
  CouponValidationCouponReadModel,
  CouponValidationCustomerContextReadModel,
  CouponValidationProductReadModel,
} from '../read-models/coupon-validation.read-model';

export const COUPON_VALIDATION_READ_REPOSITORY = Symbol('COUPON_VALIDATION_READ_REPOSITORY');

export type GetCouponValidationCustomerContextCommand = {
  readonly couponId: string;
  readonly countOrders: boolean;
  readonly countUsage: boolean;
  readonly customerPhone: string;
};

export interface CouponValidationReadRepository {
  findCouponByCode(code: string): Promise<CouponValidationCouponReadModel | null>;
  findProductsByIds(
    productIds: readonly string[],
    at: Date,
  ): Promise<CouponValidationProductReadModel[]>;
  getCustomerContext(
    command: GetCouponValidationCustomerContextCommand,
  ): Promise<CouponValidationCustomerContextReadModel>;
}
