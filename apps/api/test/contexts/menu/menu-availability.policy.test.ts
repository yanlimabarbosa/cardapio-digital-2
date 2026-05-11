import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MenuAvailabilityPolicy,
  type MenuAvailabilityContext,
} from '../../../src/modules/menu/domain/menu-availability.policy';
import type { WeeklySchedule } from '@cardapio/shared';

const lunchSchedule: WeeklySchedule = {
  1: [{ start: '11:00', end: '15:00' }],
};

const dinnerSchedule: WeeklySchedule = {
  1: [{ start: '18:00', end: '21:00' }],
};

const storeAllDaySchedule: WeeklySchedule = {
  1: [{ start: '10:00', end: '22:00' }],
};

test('force close makes menu categories unavailable', (): void => {
  const policy = MenuAvailabilityPolicy.create(context({
    forceClose: true,
    storeSchedule: storeAllDaySchedule,
  }));

  assert.equal(policy.categoryAvailability({ availabilitySchedule: lunchSchedule }).available, false);
});

test('forced store open skips the store schedule but keeps category windows', (): void => {
  const policy = MenuAvailabilityPolicy.create(context({
    storeSchedule: dinnerSchedule,
    useForcedStoreOpen: true,
  }));

  assert.equal(policy.categoryAvailability({ availabilitySchedule: lunchSchedule }).available, true);
});

test('store and category schedules must overlap', (): void => {
  const policy = MenuAvailabilityPolicy.create(context({
    storeSchedule: dinnerSchedule,
  }));

  const result = policy.categoryAvailability({ availabilitySchedule: lunchSchedule });

  assert.equal(result.available, false);
  assert.equal(result.nextAvailableLabel, undefined);
});

test('inactive products are unavailable even when schedules match', (): void => {
  const policy = MenuAvailabilityPolicy.create(context());

  const result = policy.productInCategoryAvailability({
    isActive: false,
    categoryAvailabilitySchedule: lunchSchedule,
  });

  assert.equal(result.available, false);
});

test('section products require store, category, and section windows to overlap', (): void => {
  const policy = MenuAvailabilityPolicy.create(context());

  const result = policy.productInSectionAvailability({
    isActive: true,
    categoryAvailabilitySchedule: {
      1: [{ start: '11:00', end: '15:00' }],
    },
    sectionAvailabilitySchedule: {
      1: [{ start: '12:00', end: '14:00' }],
    },
  });

  assert.equal(result.available, true);
});

test('invalid dates are rejected when creating the policy', (): void => {
  assert.throws(
    () => MenuAvailabilityPolicy.create(context({ at: new Date('invalid') })),
    /Menu availability requires a valid date/,
  );
});

function context(overrides: Partial<MenuAvailabilityContext> = {}): MenuAvailabilityContext {
  return {
    at: recifeDate('2026-05-04T13:00:00'),
    forceClose: false,
    storeSchedule: storeAllDaySchedule,
    useForcedStoreOpen: false,
    ...overrides,
  };
}

function recifeDate(value: string): Date {
  return new Date(`${value}-03:00`);
}
