import { IsString, IsOptional, IsNumber, Min, MinLength } from 'class-validator';

export class CreateOptionGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSelections?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSelections?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
