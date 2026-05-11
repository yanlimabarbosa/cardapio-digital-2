import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminCategoryMutationModel } from '../../../src/modules/admin/application/ports/admin-category-write.repository.port';
import type { AdminCategoryReadModel } from '../../../src/modules/admin/application/read-models/admin-category.read-model';
import {
  toAdminCategoryMutationResponseDto,
  toAdminCategoryResponseDto,
} from '../../../src/modules/admin/admin-category.mapper';
import { AdminCategoryMutationResponseDto } from '../../../src/modules/admin/dto/response/admin-category-mutation-response.dto';
import { AdminCategoryResponseDto } from '../../../src/modules/admin/dto/response/admin-category-response.dto';
import { WeeklyScheduleDto, WeeklyScheduleRangeDto } from '../../../src/modules/admin/dto/shared/weekly-schedule.dto';

test('maps admin category read models to response DTOs', (): void => {
  const createdAt = new Date('2026-05-07T12:00:00.000Z');
  const readModel: AdminCategoryReadModel = {
    id: 'category-1',
    name: 'Pratos',
    description: 'Pratos principais',
    imageUrl: '/uploads/pratos.webp',
    sortOrder: 1,
    isActive: true,
    availabilitySchedule: {
      1: [{ start: '09:00', end: '18:00' }],
    },
    productCount: 3,
    createdAt,
  };

  const result = toAdminCategoryResponseDto(readModel);

  assert.ok(result instanceof AdminCategoryResponseDto);
  assert.ok(result.availabilitySchedule instanceof WeeklyScheduleDto);
  assert.ok(result.availabilitySchedule[1]?.[0] instanceof WeeklyScheduleRangeDto);
  assert.equal(result.id, 'category-1');
  assert.equal(result.name, 'Pratos');
  assert.equal(result.description, 'Pratos principais');
  assert.equal(result.imageUrl, '/uploads/pratos.webp');
  assert.equal(result.sortOrder, 1);
  assert.equal(result.isActive, true);
  assert.equal(result.productCount, 3);
  assert.equal(result.createdAt, createdAt);
  assert.equal(result.availabilitySchedule[1]?.[0]?.start, '09:00');
  assert.equal(result.availabilitySchedule[1]?.[0]?.end, '18:00');
  assert.deepEqual(Object.keys(result.availabilitySchedule), ['1']);
});

test('maps admin category mutation models to response DTOs', (): void => {
  const createdAt = new Date('2026-05-07T12:00:00.000Z');
  const updatedAt = new Date('2026-05-07T12:30:00.000Z');
  const mutationModel: AdminCategoryMutationModel = {
    id: 'category-1',
    name: 'Pratos',
    description: undefined,
    imageUrl: undefined,
    sortOrder: 1,
    isActive: false,
    availabilitySchedule: {
      2: [{ start: '10:00', end: '14:00' }],
    },
    createdAt,
    updatedAt,
  };

  const result = toAdminCategoryMutationResponseDto(mutationModel);

  assert.ok(result instanceof AdminCategoryMutationResponseDto);
  assert.ok(result.availabilitySchedule instanceof WeeklyScheduleDto);
  assert.ok(result.availabilitySchedule[2]?.[0] instanceof WeeklyScheduleRangeDto);
  assert.equal(result.id, 'category-1');
  assert.equal(result.name, 'Pratos');
  assert.equal(result.description, undefined);
  assert.equal(result.imageUrl, undefined);
  assert.equal(result.sortOrder, 1);
  assert.equal(result.isActive, false);
  assert.equal(result.createdAt, createdAt);
  assert.equal(result.updatedAt, updatedAt);
  assert.equal(result.availabilitySchedule[2]?.[0]?.start, '10:00');
  assert.equal(result.availabilitySchedule[2]?.[0]?.end, '14:00');
  assert.deepEqual(Object.keys(result.availabilitySchedule), ['2']);
});
