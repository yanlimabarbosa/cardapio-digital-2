import { IsString, IsArray, ValidateNested, IsNumber, IsUUID, IsOptional, Min, MinLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateCouponItemDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  extraIds?: string[];
}

export class ValidateCouponDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ValidateCouponItemDto)
  items!: ValidateCouponItemDto[];

  @IsString()
  deliveryType!: string;

  @IsString()
  @MinLength(1)
  customerPhone!: string;
}
