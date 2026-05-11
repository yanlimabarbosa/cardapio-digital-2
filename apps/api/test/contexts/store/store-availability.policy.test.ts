import assert from 'node:assert/strict';
import test from 'node:test';
import { StoreAvailabilityPolicy } from '../../../src/modules/store/domain/store-availability.policy';
import type { WeeklySchedule } from '@cardapio/shared';

const lunchSchedule: WeeklySchedule = {
  1: [{ start: '11:00', end: '15:00' }],
};

test('force close blocks the store even during an open schedule window', (): void => {
  const result = StoreAvailabilityPolicy.create({
    at: recifeDate('2026-05-04T12:00:00'),
    forceClose: true,
    forceOpen: true,
    ignoreForceOpen: false,
    weeklySchedule: lunchSchedule,
    openingTime: '11:00',
    closingTime: '15:00',
    openDays: [1],
  }).evaluate();

  assert.equal(result.open, false);
  assert.equal(result.reason, 'Estamos temporariamente fechados');
});

test('force open opens the store outside the configured schedule', (): void => {
  const result = StoreAvailabilityPolicy.create({
    at: recifeDate('2026-05-04T09:00:00'),
    forceClose: false,
    forceOpen: true,
    ignoreForceOpen: false,
    weeklySchedule: lunchSchedule,
    openingTime: '11:00',
    closingTime: '15:00',
    openDays: [1],
  }).evaluate();

  assert.equal(result.open, true);
  assert.equal(result.reason, undefined);
});

test('ignored force open uses the configured schedule for scheduled orders', (): void => {
  const result = StoreAvailabilityPolicy.create({
    at: recifeDate('2026-05-04T09:00:00'),
    forceClose: false,
    forceOpen: true,
    ignoreForceOpen: true,
    weeklySchedule: lunchSchedule,
    openingTime: '11:00',
    closingTime: '15:00',
    openDays: [1],
  }).evaluate();

  assert.equal(result.open, false);
  assert.match(result.reason ?? '', /Abrimos hoje às 11:00/);
});

test('schedule window opens and closes the store', (): void => {
  const openResult = StoreAvailabilityPolicy.create({
    at: recifeDate('2026-05-04T12:00:00'),
    forceClose: false,
    forceOpen: false,
    ignoreForceOpen: false,
    weeklySchedule: lunchSchedule,
    openingTime: '11:00',
    closingTime: '15:00',
    openDays: [1],
  }).evaluate();
  const closedResult = StoreAvailabilityPolicy.create({
    at: recifeDate('2026-05-04T16:00:00'),
    forceClose: false,
    forceOpen: false,
    ignoreForceOpen: false,
    weeklySchedule: lunchSchedule,
    openingTime: '11:00',
    closingTime: '15:00',
    openDays: [1],
  }).evaluate();

  assert.equal(openResult.open, true);
  assert.equal(openResult.opensAt, '11:00');
  assert.equal(openResult.closesAt, '15:00');
  assert.equal(closedResult.open, false);
  assert.match(closedResult.reason ?? '', /Abrimos/);
  assert.equal(closedResult.nextOpenLabel?.startsWith('Disponível'), true);
});

test('invalid dates are rejected when creating the policy', (): void => {
  assert.throws(
    () => StoreAvailabilityPolicy.create({
      at: new Date('invalid'),
      forceClose: false,
      forceOpen: false,
      ignoreForceOpen: false,
      weeklySchedule: lunchSchedule,
    }),
    /Store availability requires a valid date/,
  );
});

function recifeDate(value: string): Date {
  return new Date(`${value}-03:00`);
}
