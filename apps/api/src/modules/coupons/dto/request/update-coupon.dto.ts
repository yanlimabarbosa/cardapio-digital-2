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
import { CouponDiscountTypeDto } from './create-coupon.dto';

export class UpdateCouponDto {
  /** Coupon code. It is normalized to uppercase when persisted. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  public readonly code?: string;

  /** Discount calculation type. */
  @IsOptional()
  @IsEnum(CouponDiscountTypeDto)
  public readonly discountType?: CouponDiscountTypeDto;

  /** Discount value in currency units or percentage points, depending on discount type. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  public readonly discountValue?: number;

  /** Maximum discount amount for percentage coupons. Null clears the value. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  public readonly maxDiscount?: number | null;

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

  /** Start of the coupon validity window as an ISO date string. Null clears the value. */
  @IsOptional()
  @IsDateString()
  public readonly validFrom?: string | null;

  /** End of the coupon validity window as an ISO date string. Null clears the value. */
  @IsOptional()
  @IsDateString()
  public readonly validUntil?: string | null;

  /** Allowed weekdays as numeric day indexes. Null clears the restriction. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  public readonly validDays?: number[] | null;

  /** Daily start time in HH:mm format. Null clears the value. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  public readonly validTimeFrom?: string | null;

  /** Daily end time in HH:mm format. Null clears the value. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  public readonly validTimeTo?: string | null;

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

  /** Optional delivery type restriction. Null clears the value. */
  @IsOptional()
  @IsString()
  public readonly deliveryTypeRestriction?: string | null;

  /** Product ids this coupon applies to. Null clears the restriction. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly applicableProductIds?: string[] | null;

  /** Category ids this coupon applies to. Null clears the restriction. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly applicableCategoryIds?: string[] | null;

  /** Section ids this coupon applies to. Null clears the restriction. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public readonly applicableSectionIds?: string[] | null;

  /** Whether the coupon is active. */
  @IsOptional()
  @IsBoolean()
  public readonly isActive?: boolean;
}
