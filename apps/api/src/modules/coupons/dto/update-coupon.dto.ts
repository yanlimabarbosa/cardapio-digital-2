import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  discountType?: 'percentage' | 'fixed';

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  validDays?: number[] | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  validTimeFrom?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  validTimeTo?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxUses?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsesPerCustomer?: number;

  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  excludePromotional?: boolean;

  @IsOptional()
  @IsString()
  deliveryTypeRestriction?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableProductIds?: string[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategoryIds?: string[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableSectionIds?: string[] | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
