import assert from 'node:assert/strict';
import test from 'node:test';
import { StoreSchedule } from '../../../src/modules/store/domain/store-schedule.value-object';

test('uses normalized weekly schedule when present', (): void => {
  const schedule = StoreSchedule.fromSettings({
    weeklySchedule: {
      1: [{ start: '10:00', end: '14:00' }],
    },
    openDays: [2],
    openingTime: '11:00',
    closingTime: '21:00',
  }).toWeeklySchedule();

  assert.deepEqual(schedule, {
    1: [{ start: '10:00', end: '14:00' }],
  });
});

test('falls back to legacy open days and opening hours', (): void => {
  const schedule = StoreSchedule.fromSettings({
    weeklySchedule: null,
    openDays: [3],
    openingTime: '11:00',
    closingTime: '21:00',
  }).toWeeklySchedule();

  assert.deepEqual(schedule, {
    3: [{ start: '11:00', end: '21:00' }],
  });
});

test('returns an empty schedule when neither weekly nor legacy settings are usable', (): void => {
  const schedule = StoreSchedule.fromSettings({
    weeklySchedule: null,
    openDays: [],
  }).toWeeklySchedule();

  assert.deepEqual(schedule, {});
});
