import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class WeeklyScheduleRangeDto {
  /** Range start time in HH:mm format. */
  @IsString()
  declare public readonly start: string;

  /** Range end time in HH:mm format. */
  @IsString()
  declare public readonly end: string;

  public constructor(start?: string, end?: string) {
    if (start !== undefined) {
      this.start = start;
    }

    if (end !== undefined) {
      this.end = end;
    }
  }
}

type WeeklyScheduleDtoValues = {
  readonly 0?: WeeklyScheduleRangeDto[];
  readonly 1?: WeeklyScheduleRangeDto[];
  readonly 2?: WeeklyScheduleRangeDto[];
  readonly 3?: WeeklyScheduleRangeDto[];
  readonly 4?: WeeklyScheduleRangeDto[];
  readonly 5?: WeeklyScheduleRangeDto[];
  readonly 6?: WeeklyScheduleRangeDto[];
};

export class WeeklyScheduleDto {
  /** Sunday availability ranges. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleRangeDto)
  declare public readonly 0?: WeeklyScheduleRangeDto[];

  /** Monday availability ranges. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleRangeDto)
  declare public readonly 1?: WeeklyScheduleRangeDto[];

  /** Tuesday availability ranges. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleRangeDto)
  declare public readonly 2?: WeeklyScheduleRangeDto[];

  /** Wednesday availability ranges. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleRangeDto)
  declare public readonly 3?: WeeklyScheduleRangeDto[];

  /** Thursday availability ranges. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleRangeDto)
  declare public readonly 4?: WeeklyScheduleRangeDto[];

  /** Friday availability ranges. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleRangeDto)
  declare public readonly 5?: WeeklyScheduleRangeDto[];

  /** Saturday availability ranges. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleRangeDto)
  declare public readonly 6?: WeeklyScheduleRangeDto[];

  public constructor(values: WeeklyScheduleDtoValues = {}) {
    if (values[0] !== undefined) {
      this[0] = values[0];
    }

    if (values[1] !== undefined) {
      this[1] = values[1];
    }

    if (values[2] !== undefined) {
      this[2] = values[2];
    }

    if (values[3] !== undefined) {
      this[3] = values[3];
    }

    if (values[4] !== undefined) {
      this[4] = values[4];
    }

    if (values[5] !== undefined) {
      this[5] = values[5];
    }

    if (values[6] !== undefined) {
      this[6] = values[6];
    }
  }
}
