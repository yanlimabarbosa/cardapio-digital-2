import { IsString, IsOptional, IsUUID, IsNumber, IsBoolean } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsUUID()
  categoryId!: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

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
