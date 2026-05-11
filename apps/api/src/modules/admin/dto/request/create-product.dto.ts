import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductDto {
  /** Product display name. */
  @IsString()
  declare public readonly name: string;

  /** Category identifier that will own this product. */
  @IsUUID()
  declare public readonly categoryId: string;

  /** Product base price. */
  @IsNumber()
  declare public readonly price: number;

  /** Optional product description. */
  @IsOptional()
  @IsString()
  public readonly description?: string;

  /** Optional product image URL. */
  @IsOptional()
  @IsString()
  public readonly imageUrl?: string;

  /** Whether this product uses option groups. */
  @IsOptional()
  @IsBoolean()
  public readonly isCompound?: boolean;

  /** Whether this product can be redeemed with loyalty points. */
  @IsOptional()
  @IsBoolean()
  public readonly isRedeemable?: boolean;

  /** Loyalty points required to redeem this product. */
  @IsOptional()
  @IsNumber()
  public readonly redemptionCost?: number;
}
