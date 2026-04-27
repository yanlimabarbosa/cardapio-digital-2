import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateExtraDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
