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

export class CreateCouponDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @IsIn(['percentage', 'fixed'])
  discountType!: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

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
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  validDays?: number[];

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  validTimeFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  validTimeTo?: string;

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
  deliveryTypeRestriction?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableProductIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableSectionIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
