import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ListAdminOrderHistoryQueryDto {
  /** Page number to return. */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  public readonly page?: number;

  /** Maximum number of orders to return. */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  public readonly limit?: number;

  /** Customer name search text or exact numeric order number. */
  @IsOptional()
  @IsString()
  public readonly search?: string;

  /** Order status filter. */
  @IsOptional()
  @IsString()
  public readonly status?: string;

  /** Inclusive creation date lower bound. */
  @IsOptional()
  @IsString()
  public readonly from?: string;

  /** Inclusive creation date upper bound, expanded to the end of the day. */
  @IsOptional()
  @IsString()
  public readonly to?: string;
}
