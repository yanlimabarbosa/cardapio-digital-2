import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityManager } from '@mikro-orm/postgresql';
import { Coupon, CouponUsage, Customer, Order } from '../../../src/entities';
import { MikroOrmOrderCouponUsageRepository } from '../../../src/modules/orders/adapters/persistence/mikro-orm-order-coupon-usage.repository';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

type SqlCall = {
  readonly sql: string;
  readonly params: readonly unknown[];
};

type EntityReference = {
  readonly entity: unknown;
  readonly id: string;
};

type CreatedEntity = {
  readonly entity: unknown;
  readonly payload: unknown;
};

type CouponUsagePayload = {
  readonly coupon: EntityReference;
  readonly customer: EntityReference;
  readonly order: EntityReference;
};

test('increments coupon usage and records the order coupon usage', async (): Promise<void> => {
  const sqlCalls: SqlCall[] = [];
  const createdEntities: CreatedEntity[] = [];
  let flushed = false;
  const fork = {
    getConnection(): { execute(sql: string, params: readonly unknown[]): Promise<unknown[]> } {
      return {
        async execute(sql: string, params: readonly unknown[]): Promise<unknown[]> {
          sqlCalls.push({ sql, params });
          return [];
        },
      };
    },
    getReference(entity: unknown, id: string): EntityReference {
      return { entity, id };
    },
    create(entity: unknown, payload: unknown): unknown {
      createdEntities.push({ entity, payload });
      return payload;
    },
    async flush(): Promise<void> {
      flushed = true;
    },
  };
  const em = {
    fork(): typeof fork {
      return fork;
    },
  } as unknown as EntityManager;
  const repository = new MikroOrmOrderCouponUsageRepository(em);

  await repository.recordUsage({
    couponId: 'coupon-1',
    customerId: 'customer-1',
    orderId: 'order-1',
  });

  assert.deepEqual(sqlCalls, [
    {
      sql: 'UPDATE "coupons" SET "current_uses" = "current_uses" + 1 WHERE "id" = ?',
      params: ['coupon-1'],
    },
  ]);
  assert.equal(createdEntities.length, 1);
  assert.equal(createdEntities[0]?.entity, CouponUsage);
  const payload = createdEntities[0]?.payload as CouponUsagePayload | undefined;
  assert.ok(payload);
  assert.deepEqual(payload.coupon, { entity: Coupon, id: 'coupon-1' });
  assert.deepEqual(payload.customer, { entity: Customer, id: 'customer-1' });
  assert.deepEqual(payload.order, { entity: Order, id: 'order-1' });
  assert.equal(flushed, true);
});

test('records coupon usage through the provided transaction context', async (): Promise<void> => {
  const sqlCalls: SqlCall[] = [];
  const createdEntities: CreatedEntity[] = [];
  let flushed = false;
  let forked = false;
  const transactionalEm = createCouponUsageEntityManager({
    createdEntities,
    onFlush: () => {
      flushed = true;
    },
    sqlCalls,
  });
  const rootEm = {
    fork(): EntityManager {
      forked = true;
      return transactionalEm;
    },
  } as unknown as EntityManager;
  const repository = new MikroOrmOrderCouponUsageRepository(rootEm);

  await repository.recordUsage({
    context: new MikroOrmTransactionContext(transactionalEm),
    couponId: 'coupon-1',
    customerId: 'customer-1',
    orderId: 'order-1',
  });

  assert.equal(forked, false);
  assert.equal(flushed, true);
  assert.deepEqual(sqlCalls, [
    {
      sql: 'UPDATE "coupons" SET "current_uses" = "current_uses" + 1 WHERE "id" = ?',
      params: ['coupon-1'],
    },
  ]);
  assert.equal(createdEntities[0]?.entity, CouponUsage);
});

function createCouponUsageEntityManager(options: {
  readonly createdEntities: CreatedEntity[];
  readonly onFlush: () => void;
  readonly sqlCalls: SqlCall[];
}): EntityManager {
  return {
    getConnection(): { execute(sql: string, params: readonly unknown[]): Promise<unknown[]> } {
      return {
        async execute(sql: string, params: readonly unknown[]): Promise<unknown[]> {
          options.sqlCalls.push({ sql, params });
          return [];
        },
      };
    },
    getReference(entity: unknown, id: string): EntityReference {
      return { entity, id };
    },
    create(entity: unknown, payload: unknown): unknown {
      options.createdEntities.push({ entity, payload });
      return payload;
    },
    async flush(): Promise<void> {
      options.onFlush();
    },
  } as unknown as EntityManager;
}
