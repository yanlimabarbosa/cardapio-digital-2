import assert from 'node:assert/strict';
import test from 'node:test';
import { ScheduledOrderPolicy } from '../../../src/modules/orders/domain/scheduled-order.policy';

const now = new Date('2026-05-07T12:00:00.000Z');

test('uses the current date for immediate orders', (): void => {
  const result = ScheduledOrderPolicy.at(now).resolve();

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.scheduledFor, null);
    assert.equal(result.targetDate, now);
  }
});

test('uses the current date for null scheduled orders', (): void => {
  const result = ScheduledOrderPolicy.at(now).resolve(null);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.scheduledFor, null);
    assert.equal(result.targetDate, now);
  }
});

test('rejects invalid scheduled order dates with the existing message', (): void => {
  const result = ScheduledOrderPolicy.at(now).resolve('not-a-date');

  assert.deepEqual(result, {
    valid: false,
    reason: 'invalid',
    message: 'Horário agendado inválido',
  });
});

test('rejects scheduled order dates older than the grace window', (): void => {
  const result = ScheduledOrderPolicy.at(now).resolve('2026-05-07T11:58:59.999Z');

  assert.deepEqual(result, {
    valid: false,
    reason: 'past',
    message: 'Horário agendado já passou',
  });
});

test('allows scheduled order dates inside the one-minute grace window', (): void => {
  const scheduledFor = '2026-05-07T11:59:00.000Z';
  const result = ScheduledOrderPolicy.at(now).resolve(scheduledFor);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.scheduledFor?.toISOString(), scheduledFor);
    assert.equal(result.targetDate.toISOString(), scheduledFor);
  }
});

test('allows future scheduled order dates', (): void => {
  const scheduledFor = '2026-05-07T13:00:00.000Z';
  const result = ScheduledOrderPolicy.at(now).resolve(scheduledFor);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.scheduledFor?.toISOString(), scheduledFor);
    assert.equal(result.targetDate.toISOString(), scheduledFor);
  }
});

test('rejects invalid current dates', (): void => {
  assert.throws(
    () => ScheduledOrderPolicy.at(new Date('invalid')),
    /Scheduled order policy requires a valid current date/,
  );
});
