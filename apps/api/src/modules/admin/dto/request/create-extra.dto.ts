import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateExtraDto {
  /** Extra display name. */
  @IsString()
  declare public readonly name: string;

  /** Price charged for this extra. */
  @IsNumber()
  declare public readonly price: number;

  /** Optional image URL. */
  @IsOptional()
  @IsString()
  public readonly imageUrl?: string;
}
