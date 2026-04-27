import { IsString, IsOptional, IsEmail, IsArray, ValidateNested, IsNumber, IsUUID, IsEnum, IsIn, IsObject, Min, Max, MinLength, MaxLength, ArrayMinSize, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@cardapio/shared';

export class OptionSelectionDto {
  @IsUUID()
  groupId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  optionIds!: string[];
}

export class CreateOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(1)
  @Max(99)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  extraIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionSelectionDto)
  optionSelections?: OptionSelectionDto[];
}

export class DeliveryAddressDto {
  @IsString()
  cep!: string;

  @IsString()
  street!: string;

  @IsString()
  number!: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsString()
  neighborhood!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;
}

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  customerName!: string;

  @IsString()
  @MinLength(10)
  customerPhone!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsIn(['pickup', 'delivery'])
  deliveryType!: 'pickup' | 'delivery';

  @ValidateIf((o) => o.deliveryType === 'delivery')
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @ValidateIf((o) => o.deliveryType === 'delivery')
  @IsOptional()
  @IsUUID()
  deliveryAreaId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RedeemedItemDto)
  redeemedItems?: RedeemedItemDto[];
}

export class RedeemedItemDto {
  @IsUUID()
  productId!: string;
}
