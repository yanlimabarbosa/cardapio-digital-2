import { IsString, IsInt, Min, MinLength } from 'class-validator';

export class CreateCombinedLimitDto {
  /** Combined-limit display name. */
  @IsString()
  @MinLength(1)
  declare public readonly name: string;

  /** Maximum number of selections allowed across the grouped option-groups. */
  @IsInt()
  @Min(1)
  declare public readonly maxSelections: number;
}
