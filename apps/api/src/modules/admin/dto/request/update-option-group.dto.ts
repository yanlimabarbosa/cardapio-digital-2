import { IsString, IsOptional, IsNumber, IsBoolean, Min, MinLength } from 'class-validator';

export class UpdateOptionGroupDto {
  /** Option group display name. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  public readonly name?: string;

  /** Minimum number of options a customer may select. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  public readonly minSelections?: number;

  /** Maximum number of options a customer may select. */
  @IsOptional()
  @IsNumber()
  @Min(1)
  public readonly maxSelections?: number;

  /** Relative display order among the product option groups. */
  @IsOptional()
  @IsNumber()
  public readonly sortOrder?: number;

  /** Whether this option group is currently active. */
  @IsOptional()
  @IsBoolean()
  public readonly isActive?: boolean;
}
