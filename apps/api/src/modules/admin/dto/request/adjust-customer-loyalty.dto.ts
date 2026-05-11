import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AdjustCustomerLoyaltyDto {
  /** Customer identifier whose balance should be adjusted. */
  @IsString()
  declare public readonly customerId: string;

  /** Number of loyalty points to add or subtract. */
  @IsNumber()
  declare public readonly points: number;

  /** Optional manual adjustment description. */
  @IsOptional()
  @IsString()
  public readonly description?: string;
}
