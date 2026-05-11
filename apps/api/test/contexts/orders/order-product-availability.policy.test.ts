import assert from 'node:assert/strict';
import test from 'node:test';
import type { WeeklySchedule } from '@cardapio/shared';
import {
  InvalidOrderProductAvailabilityError,
  OrderProductAvailabilityPolicy,
} from '../../../src/modules/orders/domain/order-product-availability.policy';

test('accepts products inside the category availability window', (): void => {
  assert.doesNotThrow(() => {
    OrderProductAvailabilityPolicy.for(
      {
        name: 'Quentinha P',
        categoryAvailabilitySchedule: lunchSchedule(),
      },
      new Date('2026-05-08T15:00:00.000Z'),
    ).assertAvailable();
  });
});

test('rejects products outside the category availability window with the existing product message', (): void => {
  assert.throws(
    () => {
      OrderProductAvailabilityPolicy.for(
        {
          name: 'Quentinha P',
          categoryAvailabilitySchedule: emptySchedule(),
        },
        new Date('2026-05-08T15:00:00.000Z'),
      ).assertAvailable();
    },
    (error: unknown): boolean =>
      error instanceof InvalidOrderProductAvailabilityError
      && error.message === 'Quentinha P indisponível no horário selecionado',
  );
});

test('rejects invalid availability dates', (): void => {
  assert.throws(
    () => OrderProductAvailabilityPolicy.for({ name: 'Quentinha P' }, new Date('invalid')),
    /Order product availability date must be valid/,
  );
});

function lunchSchedule(): WeeklySchedule {
  return {
    5: [{ start: '11:00', end: '15:00' }],
  };
}

function emptySchedule(): WeeklySchedule {
  return {
    5: [],
  };
}
