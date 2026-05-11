import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateCouponItemDto {
  /** Product identifier to validate against the coupon restrictions. */
  @IsUUID()
  declare public readonly productId: string;

  /** Quantity of this product in the order preview. */
  @IsNumber()
  @Min(1)
  declare public readonly quantity: number;

  /** Selected flat extra identifiers. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  public readonly extraIds?: string[];
}

export class ValidateCouponDto {
  /** Coupon code to validate. */
  @IsString()
  @MinLength(1)
  declare public readonly code: string;

  /** Order items used to calculate coupon eligibility. */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ValidateCouponItemDto)
  declare public readonly items: ValidateCouponItemDto[];

  /** Delivery type for restriction checks. */
  @IsString()
  declare public readonly deliveryType: string;

  /** Customer phone used for per-customer coupon restrictions. */
  @IsString()
  @MinLength(1)
  declare public readonly customerPhone: string;
}
