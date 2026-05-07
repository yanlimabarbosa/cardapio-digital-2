import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import type { WeeklySchedule } from '@cardapio/shared';

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  availabilitySchedule?: WeeklySchedule | null;
}
