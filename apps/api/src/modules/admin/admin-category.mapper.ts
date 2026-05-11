import type { TimeRange, WeeklySchedule } from '@cardapio/shared';
import type { AdminCategoryMutationModel } from './application/ports/admin-category-write.repository.port';
import type { AdminCategoryReadModel } from './application/read-models/admin-category.read-model';
import { AdminCategoryMutationResponseDto } from './dto/response/admin-category-mutation-response.dto';
import { AdminCategoryResponseDto } from './dto/response/admin-category-response.dto';
import { WeeklyScheduleDto, WeeklyScheduleRangeDto } from './dto/shared/weekly-schedule.dto';

export function toAdminCategoryResponseDto(category: AdminCategoryReadModel): AdminCategoryResponseDto {
  return new AdminCategoryResponseDto(
    category.id,
    category.name,
    category.description,
    category.imageUrl,
    category.sortOrder,
    category.isActive,
    toWeeklyScheduleDto(category.availabilitySchedule),
    category.productCount,
    category.createdAt,
  );
}

export function toAdminCategoryMutationResponseDto(
  category: AdminCategoryMutationModel,
): AdminCategoryMutationResponseDto {
  return new AdminCategoryMutationResponseDto(
    category.id,
    category.name,
    category.description,
    category.imageUrl,
    category.sortOrder,
    category.isActive,
    toWeeklyScheduleDto(category.availabilitySchedule),
    category.createdAt,
    category.updatedAt,
  );
}

function toWeeklyScheduleDto(schedule: WeeklySchedule | null | undefined): WeeklyScheduleDto | null {
  if (!schedule) {
    return null;
  }

  return new WeeklyScheduleDto({
    0: toWeeklyScheduleRangeDtos(schedule[0]),
    1: toWeeklyScheduleRangeDtos(schedule[1]),
    2: toWeeklyScheduleRangeDtos(schedule[2]),
    3: toWeeklyScheduleRangeDtos(schedule[3]),
    4: toWeeklyScheduleRangeDtos(schedule[4]),
    5: toWeeklyScheduleRangeDtos(schedule[5]),
    6: toWeeklyScheduleRangeDtos(schedule[6]),
  });
}

function toWeeklyScheduleRangeDtos(ranges: readonly TimeRange[] | undefined): WeeklyScheduleRangeDto[] | undefined {
  return ranges?.map(toWeeklyScheduleRangeDto);
}

function toWeeklyScheduleRangeDto(range: TimeRange): WeeklyScheduleRangeDto {
  return new WeeklyScheduleRangeDto(range.start, range.end);
}
