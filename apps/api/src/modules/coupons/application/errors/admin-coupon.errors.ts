export class AdminCouponDuplicateCodeError extends Error {
  public constructor() {
    super('ADMIN_COUPON_DUPLICATE_CODE');
  }
}

export class AdminCouponNotFoundError extends Error {
  public constructor() {
    super('ADMIN_COUPON_NOT_FOUND');
  }
}
