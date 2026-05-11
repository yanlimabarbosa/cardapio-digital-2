import { IsString, IsOptional, IsUUID, IsNumber, IsBoolean, IsDateString } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPromotional?: boolean;

  @IsOptional()
  @IsNumber()
  promotionalPrice?: number | null;

  @IsOptional()
  @IsString()
  promotionStartDate?: string | null;

  @IsOptional()
  @IsString()
  promotionEndDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isCompound?: boolean;

  @IsOptional()
  @IsBoolean()
  isRedeemable?: boolean;

  @IsOptional()
  @IsNumber()
  redemptionCost?: number;
}
