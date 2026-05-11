export const ORDER_COUPON_VALIDATOR = Symbol('ORDER_COUPON_VALIDATOR');

export interface OrderCouponOptionSelectionInput {
  readonly groupId: string;
  readonly optionIds: readonly string[];
}

export interface OrderCouponItemInput {
  readonly productId: string;
  readonly quantity: number;
  readonly extraIds?: readonly string[];
  readonly optionSelections?: readonly OrderCouponOptionSelectionInput[];
}

export interface ValidateOrderCouponCommand {
  readonly code: string;
  readonly items: readonly OrderCouponItemInput[];
  readonly deliveryType: string;
  readonly customerPhone: string;
}

export interface OrderCouponModel {
  readonly id: string;
  readonly code: string;
}

export interface OrderCouponValidationSuccess {
  readonly valid: true;
  readonly coupon: OrderCouponModel;
  readonly discountCents: number;
  readonly discountAmount: string;
}

export interface OrderCouponValidationFailure {
  readonly valid: false;
  readonly reason: string;
}

export type OrderCouponValidationResult =
  | OrderCouponValidationSuccess
  | OrderCouponValidationFailure;

export interface OrderCouponValidator {
  validate(command: ValidateOrderCouponCommand): Promise<OrderCouponValidationResult>;
}
