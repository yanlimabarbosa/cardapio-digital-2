export class ValidateCouponResponseCouponDto {
  public constructor(
    public readonly code: string,
    public readonly discountType: string,
    public readonly discountValue: number,
  ) {}
}

export class ValidateCouponResponseDto {
  public constructor(
    public readonly valid: boolean,
    public readonly reason?: string,
    public readonly discount?: number,
    public readonly eligibleAmount?: number,
    public readonly coupon?: ValidateCouponResponseCouponDto,
  ) {}
}
