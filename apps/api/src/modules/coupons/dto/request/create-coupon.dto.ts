import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export enum CouponDiscountTypeDto {
  Fixed = 'fixed',
  Percentage = 'percentage',
}

export class CreateCouponDto {
  /** Coupon code. It is normalized to uppercase when persisted. */
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  declare public readonly code: string;

  /** Discount calculation type. */
  @IsEnum(CouponDiscountTypeDto)
  declare public readonly discountType: CouponDiscountTypeDto;

  /** Discount value in currency units or percentage points, depending on discount type. */
  @IsNumber()
  @Min(0)
  declare public readonly discountValue: number;

  /** Maximum discount amount for percentage coupons. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  public readonly maxDiscount?: number;

  /** Minimum eligible order amount required to use the coupon. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  public readonly minOrderAmount?: number;

  /** Minimum eligible item quantity required to use the coupon. */
  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly minQuantity?: number;

  /** Start of the coupon validity window as an ISO date string. */
  @IsOptional()
  @IsDateString()
  public readonly validFrom?: string;

  /** End of the coupon validity window as an ISO date string. */
  @IsOptional()
  @IsDateString()
  public readonly validUntil?: string;

  /** Allowed weekdays as numeric day indexes. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  public readonly validDays?: number[];

  /** Daily start time in HH:mm format. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  public readonly validTimeFrom?: string;

  /** Daily end time in HH:mm format. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  public readonly validTimeTo?: string;

  /** Maximum global coupon uses. Zero means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly maxUses?: number;

  /** Maximum uses for a single customer. Zero means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  public readonly maxUsesPerCustomer?: number;

  /** Whether this coupon can be used only on the customer's first order. */
  @IsOptional()
  @IsBoolean()
  public readonly firstOrderOnly?: boolean;

  /** Whether promotional products are excluded from coupon eligibility. */
  @IsOptional()
  @IsBoolean()
  public readonly excludePromotional?: boolean;

  /** Optional delivery type restriction. */
  @IsOptional()
  @IsString()
  public readonly deliveryTypeRestriction?: string;

  /** Product ids this coupon applies to. Empty or omitted means no product restriction. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly applicableProductIds?: string[];

  /** Category ids this coupon applies to. Empty or omitted means no category restriction. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly applicableCategoryIds?: string[];

  /** Section ids this coupon applies to. Empty or omitted means no section restriction. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly applicableSectionIds?: string[];

  /** Whether the coupon is active immediately after creation. */
  @IsOptional()
  @IsBoolean()
  public readonly isActive?: boolean;
}
