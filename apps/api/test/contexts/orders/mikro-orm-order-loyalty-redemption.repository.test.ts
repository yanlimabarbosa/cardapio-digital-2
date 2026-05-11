import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityManager } from '@mikro-orm/postgresql';
import { Customer, LoyaltyTransaction, Order } from '../../../src/entities';
import { MikroOrmOrderLoyaltyRedemptionRepository } from '../../../src/modules/orders/adapters/persistence/mikro-orm-order-loyalty-redemption.repository';
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

type LoyaltyTransactionPayload = {
  readonly customer: EntityReference;
  readonly order: EntityReference;
  readonly points: number;
  readonly type: string;
  readonly description: string;
};

test('debits loyalty points atomically when the customer has enough balance', async (): Promise<void> => {
  const sqlCalls: SqlCall[] = [];
  const em = createFakeEntityManager({
    executeResult: [{ loyalty_points: 4 }],
    sqlCalls,
  });
  const repository = new MikroOrmOrderLoyaltyRedemptionRepository(em);

  const result = await repository.debitPoints({
    customerId: 'customer-1',
    points: 2,
  });

  assert.deepEqual(result, { debited: true });
  assert.deepEqual(sqlCalls, [
    {
      sql: 'UPDATE "customers" SET "loyalty_points" = "loyalty_points" - ? WHERE "id" = ? AND "loyalty_points" >= ? RETURNING "loyalty_points"',
      params: [2, 'customer-1', 2],
    },
  ]);
});

test('reports failed loyalty debit when the balance is insufficient', async (): Promise<void> => {
  const repository = new MikroOrmOrderLoyaltyRedemptionRepository(createFakeEntityManager({ executeResult: [] }));

  const result = await repository.debitPoints({
    customerId: 'customer-1',
    points: 10,
  });

  assert.deepEqual(result, { debited: false });
});

test('records a loyalty redemption transaction for the order', async (): Promise<void> => {
  const createdEntities: CreatedEntity[] = [];
  const flushes: string[] = [];
  const em = createFakeEntityManager({
    createdEntities,
    flushes,
  });
  const repository = new MikroOrmOrderLoyaltyRedemptionRepository(em);

  await repository.recordRedemption({
    customerId: 'customer-1',
    orderId: 'order-1',
    orderNumber: 42,
    points: 3,
  });

  assert.equal(createdEntities.length, 1);
  assert.equal(createdEntities[0]?.entity, LoyaltyTransaction);
  const payload = createdEntities[0]?.payload as LoyaltyTransactionPayload | undefined;
  assert.ok(payload);
  assert.deepEqual(payload.customer, { entity: Customer, id: 'customer-1' });
  assert.deepEqual(payload.order, { entity: Order, id: 'order-1' });
  assert.equal(payload.points, -3);
  assert.equal(payload.type, 'redeem');
  assert.equal(payload.description, 'Resgate — Pedido #42');
  assert.deepEqual(flushes, ['flush']);
});

test('uses the provided transaction context for debit and redemption recording', async (): Promise<void> => {
  const createdEntities: CreatedEntity[] = [];
  const flushes: string[] = [];
  const sqlCalls: SqlCall[] = [];
  let forked = false;
  const transactionalEm = createDirectFakeEntityManager({
    createdEntities,
    executeResult: [{ loyalty_points: 4 }],
    flushes,
    sqlCalls,
  });
  const rootEm = {
    fork(): EntityManager {
      forked = true;
      return transactionalEm;
    },
  } as unknown as EntityManager;
  const repository = new MikroOrmOrderLoyaltyRedemptionRepository(rootEm);
  const context = new MikroOrmTransactionContext(transactionalEm);

  const debitResult = await repository.debitPoints({
    context,
    customerId: 'customer-1',
    points: 2,
  });
  await repository.recordRedemption({
    context,
    customerId: 'customer-1',
    orderId: 'order-1',
    orderNumber: 42,
    points: 2,
  });

  assert.equal(forked, false);
  assert.deepEqual(debitResult, { debited: true });
  assert.deepEqual(sqlCalls, [
    {
      sql: 'UPDATE "customers" SET "loyalty_points" = "loyalty_points" - ? WHERE "id" = ? AND "loyalty_points" >= ? RETURNING "loyalty_points"',
      params: [2, 'customer-1', 2],
    },
  ]);
  assert.equal(createdEntities[0]?.entity, LoyaltyTransaction);
  assert.deepEqual(flushes, ['flush']);
});

function createFakeEntityManager(options: {
  readonly createdEntities?: CreatedEntity[];
  readonly executeResult?: readonly unknown[];
  readonly flushes?: string[];
  readonly sqlCalls?: SqlCall[];
}): EntityManager {
  const fork = createDirectFakeEntityManager(options);
  const em = {
    fork(): EntityManager {
      return fork;
    },
  } as unknown as EntityManager;

  return em;
}

function createDirectFakeEntityManager(options: {
  readonly createdEntities?: CreatedEntity[];
  readonly executeResult?: readonly unknown[];
  readonly flushes?: string[];
  readonly sqlCalls?: SqlCall[];
}): EntityManager {
  return {
    getConnection(): { execute(sql: string, params: readonly unknown[]): Promise<readonly unknown[]> } {
      return {
        async execute(sql: string, params: readonly unknown[]): Promise<readonly unknown[]> {
          options.sqlCalls?.push({ sql, params });
          return options.executeResult ?? [];
        },
      };
    },
    getReference(entity: unknown, id: string): EntityReference {
      return { entity, id };
    },
    create(entity: unknown, payload: unknown): unknown {
      options.createdEntities?.push({ entity, payload });
      return payload;
    },
    async flush(): Promise<void> {
      options.flushes?.push('flush');
    },
  } as unknown as EntityManager;
}
