import { IsString, IsOptional, IsInt, Min, MinLength } from 'class-validator';

export class UpdateCombinedLimitDto {
  /** Combined-limit display name. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  public readonly name?: string;

  /** Maximum number of selections allowed across the grouped option-groups. */
  @IsOptional()
  @IsInt()
  @Min(1)
  public readonly maxSelections?: number;
}
