import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WeeklyScheduleDto } from '../shared/weekly-schedule.dto';

export class UpdateCategoryDto {
  /** Category display name. */
  @IsOptional()
  @IsString()
  public readonly name?: string;

  /** Optional category description. */
  @IsOptional()
  @IsString()
  public readonly description?: string;

  /** Optional category image URL. */
  @IsOptional()
  @IsString()
  public readonly imageUrl?: string;

  /** Sort position in the admin menu. */
  @IsOptional()
  @IsNumber()
  public readonly sortOrder?: number;

  /** Whether the category is active. */
  @IsOptional()
  @IsBoolean()
  public readonly isActive?: boolean;

  /** Weekly availability schedule, or null when no category schedule is configured. */
  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  public readonly availabilitySchedule?: WeeklyScheduleDto | null;
}
