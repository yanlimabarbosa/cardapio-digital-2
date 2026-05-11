import { IsOptional, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WeeklyScheduleDto } from '../shared/weekly-schedule.dto';

export class CreateCategoryDto {
  /** Category display name. */
  @IsString()
  declare public readonly name: string;

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

  /** Weekly availability schedule, or null when no category schedule is configured. */
  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  public readonly availabilitySchedule?: WeeklyScheduleDto | null;
}
