import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminSectionMutationModel } from '../../../src/modules/admin/application/ports/admin-section-write.repository.port';
import type { AdminSectionReadModel } from '../../../src/modules/admin/application/read-models/admin-section.read-model';
import {
  AdminSectionMutationResponseDto,
  AdminSectionProductResponseDto,
  AdminSectionResponseDto,
  AdminSectionWeeklyScheduleRangeResponseDto,
  AdminSectionWeeklyScheduleResponseDto,
} from '../../../src/modules/sections/dto/response/admin-section-response.dto';
import {
  toAdminSectionMutationResponseDto,
  toAdminSectionResponseDto,
} from '../../../src/modules/sections/section.mapper';

test('maps admin section read models to response DTOs', (): void => {
  const readModel: AdminSectionReadModel = {
    id: 'section-1',
    label: 'Lunch',
    emoji: ':)',
    sortOrder: 1,
    isActive: true,
    availabilitySchedule: {
      1: [{ start: '11:00', end: '15:00' }],
    },
    productCount: 1,
    products: [
      {
        id: 'product-1',
        name: 'Quentinha',
        price: 17.5,
        imageUrl: '/uploads/quentinha.webp',
      },
    ],
  };

  const result = toAdminSectionResponseDto(readModel);

  assert.ok(result instanceof AdminSectionResponseDto);
  assert.ok(result.availabilitySchedule instanceof AdminSectionWeeklyScheduleResponseDto);
  assert.ok(result.availabilitySchedule[1]?.[0] instanceof AdminSectionWeeklyScheduleRangeResponseDto);
  assert.ok(result.products[0] instanceof AdminSectionProductResponseDto);
  assert.equal(result.id, 'section-1');
  assert.equal(result.label, 'Lunch');
  assert.equal(result.emoji, ':)');
  assert.equal(result.sortOrder, 1);
  assert.equal(result.isActive, true);
  assert.equal(result.availabilitySchedule[1]?.[0]?.start, '11:00');
  assert.equal(result.availabilitySchedule[1]?.[0]?.end, '15:00');
  assert.equal(result.productCount, 1);
  assert.equal(result.products[0]?.id, 'product-1');
  assert.equal(result.products[0]?.name, 'Quentinha');
  assert.equal(result.products[0]?.price, 17.5);
  assert.equal(result.products[0]?.imageUrl, '/uploads/quentinha.webp');
});

test('maps missing admin section schedules to null', (): void => {
  const readModel: AdminSectionReadModel = {
    id: 'section-1',
    label: 'Lunch',
    emoji: undefined,
    sortOrder: 1,
    isActive: true,
    availabilitySchedule: null,
    productCount: 0,
    products: [],
  };

  const result = toAdminSectionResponseDto(readModel);

  assert.equal(result.availabilitySchedule, null);
});

test('maps admin section mutation models to response DTOs', (): void => {
  const mutationModel: AdminSectionMutationModel = {
    id: 'section-1',
    label: 'Dinner',
    emoji: ':D',
    sortOrder: 2,
    isActive: false,
    availabilitySchedule: {
      2: [{ start: '18:00', end: '22:00' }],
    },
  };

  const result = toAdminSectionMutationResponseDto(mutationModel);

  assert.ok(result instanceof AdminSectionMutationResponseDto);
  assert.ok(result.availabilitySchedule instanceof AdminSectionWeeklyScheduleResponseDto);
  assert.equal(result.id, 'section-1');
  assert.equal(result.label, 'Dinner');
  assert.equal(result.emoji, ':D');
  assert.equal(result.sortOrder, 2);
  assert.equal(result.isActive, false);
  assert.equal(result.availabilitySchedule[2]?.[0]?.start, '18:00');
  assert.equal(result.availabilitySchedule[2]?.[0]?.end, '22:00');
});
