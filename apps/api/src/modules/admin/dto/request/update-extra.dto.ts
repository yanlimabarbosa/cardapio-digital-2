import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateExtraDto {
  /** Extra display name. */
  @IsOptional()
  @IsString()
  public readonly name?: string;

  /** Price charged for this extra. */
  @IsOptional()
  @IsNumber()
  public readonly price?: number;

  /** Optional image URL. */
  @IsOptional()
  @IsString()
  public readonly imageUrl?: string;

  /** Whether this extra is active. */
  @IsOptional()
  @IsBoolean()
  public readonly isActive?: boolean;
}
