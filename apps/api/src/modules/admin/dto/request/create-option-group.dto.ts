import { IsString, IsOptional, IsNumber, IsBoolean, Min, MinLength } from 'class-validator';

export class CreateOptionGroupDto {
  /** Option group display name. */
  @IsString()
  @MinLength(1)
  declare public readonly name: string;

  /** Minimum number of options required from this group. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  public readonly minSelections?: number;

  /** Maximum number of options allowed from this group. */
  @IsOptional()
  @IsNumber()
  @Min(1)
  public readonly maxSelections?: number;

  /** Sort position inside the product. */
  @IsOptional()
  @IsNumber()
  public readonly sortOrder?: number;

  /** Whether the same option can be picked more than once. */
  @IsOptional()
  @IsBoolean()
  public readonly allowRepeat?: boolean;
}
