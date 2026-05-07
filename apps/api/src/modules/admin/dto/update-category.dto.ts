import { IsString, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';
import type { WeeklySchedule } from '@cardapio/shared';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

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
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  availabilitySchedule?: WeeklySchedule | null;
}
