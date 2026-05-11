import type { TimeRange, WeeklySchedule } from '@cardapio/shared';
import type {
  AdminSectionProductReadModel,
  AdminSectionReadModel,
} from '../admin/application/read-models/admin-section.read-model';
import type { AdminSectionMutationModel } from '../admin/application/ports/admin-section-write.repository.port';
import {
  AdminSectionMutationResponseDto,
  AdminSectionProductResponseDto,
  AdminSectionResponseDto,
  AdminSectionWeeklyScheduleRangeResponseDto,
  AdminSectionWeeklyScheduleResponseDto,
} from './dto/response/admin-section-response.dto';

export function toAdminSectionResponseDto(section: AdminSectionReadModel): AdminSectionResponseDto {
  return new AdminSectionResponseDto(
    section.id,
    section.label,
    section.emoji,
    section.sortOrder,
    section.isActive,
    toWeeklyScheduleDto(section.availabilitySchedule),
    section.productCount,
    section.products.map(toAdminSectionProductResponseDto),
  );
}

export function toAdminSectionMutationResponseDto(
  section: AdminSectionMutationModel,
): AdminSectionMutationResponseDto {
  return new AdminSectionMutationResponseDto(
    section.id,
    section.label,
    section.emoji,
    section.sortOrder,
    section.isActive,
    toWeeklyScheduleDto(section.availabilitySchedule),
  );
}

function toAdminSectionProductResponseDto(
  product: AdminSectionProductReadModel,
): AdminSectionProductResponseDto {
  return new AdminSectionProductResponseDto(product.id, product.name, product.price, product.imageUrl);
}

function toWeeklyScheduleDto(
  schedule: WeeklySchedule | null | undefined,
): AdminSectionWeeklyScheduleResponseDto | null {
  if (!schedule) {
    return null;
  }

  return new AdminSectionWeeklyScheduleResponseDto({
    0: toWeeklyScheduleRangeDtos(schedule[0]),
    1: toWeeklyScheduleRangeDtos(schedule[1]),
    2: toWeeklyScheduleRangeDtos(schedule[2]),
    3: toWeeklyScheduleRangeDtos(schedule[3]),
    4: toWeeklyScheduleRangeDtos(schedule[4]),
    5: toWeeklyScheduleRangeDtos(schedule[5]),
    6: toWeeklyScheduleRangeDtos(schedule[6]),
  });
}

function toWeeklyScheduleRangeDtos(
  ranges: readonly TimeRange[] | undefined,
): AdminSectionWeeklyScheduleRangeResponseDto[] | undefined {
  return ranges?.map(toWeeklyScheduleRangeDto);
}

function toWeeklyScheduleRangeDto(range: TimeRange): AdminSectionWeeklyScheduleRangeResponseDto {
  return new AdminSectionWeeklyScheduleRangeResponseDto(range.start, range.end);
}
