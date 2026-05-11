import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmAdminCouponWriteRepository } from '../../../src/modules/coupons/adapters/persistence/mikro-orm-admin-coupon-write.repository';
import type { CouponCreationData } from '../../../src/modules/coupons/domain/coupon-creation-draft.value-object';
import { CouponUpdatePatch } from '../../../src/modules/coupons/domain/coupon-update-patch.value-object';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import { Coupon } from '../../../src/entities';

test('creates an admin coupon through the provided transaction context', async (): Promise<void> => {
  const em = new FakeEntityManager();
  const repository = new MikroOrmAdminCouponWriteRepository();

  const result = await repository.create(
    couponCreationData(),
    new MikroOrmTransactionContext(em as unknown as EntityManager),
  );

  assert.deepEqual(em.findOneCalls, [{ entity: Coupon, where: { code: 'SAVE10' } }]);
  assert.deepEqual(em.createdPayloads, [couponCreationData()]);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'created',
    coupon: {
      id: 'coupon-1',
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscount: 25,
      minOrderAmount: 50,
      minQuantity: 2,
      validFrom: '2026-05-01T00:00:00.000Z',
      validUntil: '2026-05-31T23:59:59.000Z',
      validDays: [1, 2, 3],
      validTimeFrom: '10:00',
      validTimeTo: '18:00',
      maxUses: 100,
      maxUsesPerCustomer: 2,
      currentUses: 0,
      firstOrderOnly: true,
      excludePromotional: true,
      deliveryTypeRestriction: 'delivery',
      applicableProductIds: ['product-1'],
      applicableCategoryIds: ['category-1'],
      applicableSectionIds: ['section-1'],
      isActive: true,
      createdAt: '2026-05-07T10:00:00.000Z',
      updatedAt: '2026-05-07T11:00:00.000Z',
    },
  });
});

test('returns duplicate without creating or flushing when the normalized code exists', async (): Promise<void> => {
  const existing = new Coupon();
  existing.id = 'existing-coupon';
  const em = new FakeEntityManager(existing);
  const repository = new MikroOrmAdminCouponWriteRepository();

  const result = await repository.create(
    couponCreationData(),
    new MikroOrmTransactionContext(em as unknown as EntityManager),
  );

  assert.deepEqual(result, { status: 'duplicate-code' });
  assert.deepEqual(em.createdPayloads, []);
  assert.equal(em.flushCalls, 0);
});

test('toggles an admin coupon active state through the provided transaction context', async (): Promise<void> => {
  const coupon = persistedCoupon(true);
  const em = new FakeEntityManager(coupon);
  const repository = new MikroOrmAdminCouponWriteRepository();

  const result = await repository.toggleActive(
    'coupon-1',
    new MikroOrmTransactionContext(em as unknown as EntityManager),
  );

  assert.deepEqual(em.findOneCalls, [{ entity: Coupon, where: { id: 'coupon-1' } }]);
  assert.equal(coupon.isActive, false);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'updated',
    coupon: {
      id: 'coupon-1',
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscount: 25,
      minOrderAmount: 50,
      minQuantity: 2,
      validFrom: '2026-05-01T00:00:00.000Z',
      validUntil: '2026-05-31T23:59:59.000Z',
      validDays: [1, 2, 3],
      validTimeFrom: '10:00',
      validTimeTo: '18:00',
      maxUses: 100,
      maxUsesPerCustomer: 2,
      currentUses: 0,
      firstOrderOnly: true,
      excludePromotional: true,
      deliveryTypeRestriction: 'delivery',
      applicableProductIds: ['product-1'],
      applicableCategoryIds: ['category-1'],
      applicableSectionIds: ['section-1'],
      isActive: false,
      createdAt: '2026-05-07T10:00:00.000Z',
      updatedAt: '2026-05-07T11:00:00.000Z',
    },
  });
});

test('returns not found without flushing when toggling a missing coupon', async (): Promise<void> => {
  const em = new FakeEntityManager();
  const repository = new MikroOrmAdminCouponWriteRepository();

  const result = await repository.toggleActive(
    'missing-coupon',
    new MikroOrmTransactionContext(em as unknown as EntityManager),
  );

  assert.deepEqual(em.findOneCalls, [{ entity: Coupon, where: { id: 'missing-coupon' } }]);
  assert.deepEqual(result, { status: 'not-found' });
  assert.equal(em.flushCalls, 0);
});

test('updates an admin coupon through the provided transaction context', async (): Promise<void> => {
  const coupon = persistedCoupon(true);
  const em = new FakeEntityManager(coupon, null);
  const repository = new MikroOrmAdminCouponWriteRepository();

  const result = await repository.update(
    'coupon-1',
    CouponUpdatePatch.create({
      code: 'save15',
      discountValue: 15,
      maxDiscount: null,
      validFrom: null,
      validDays: null,
      applicableProductIds: ['product-9'],
      isActive: false,
    }),
    new MikroOrmTransactionContext(em as unknown as EntityManager),
  );

  assert.deepEqual(em.findOneCalls, [
    { entity: Coupon, where: { id: 'coupon-1' } },
    { entity: Coupon, where: { code: 'SAVE15', id: { $ne: 'coupon-1' } } },
  ]);
  assert.equal(coupon.code, 'SAVE15');
  assert.equal(coupon.discountValue, '15.00');
  assert.equal(coupon.maxDiscount, undefined);
  assert.equal(coupon.validFrom, undefined);
  assert.equal(coupon.validDays, undefined);
  assert.deepEqual(coupon.applicableProductIds, ['product-9']);
  assert.equal(coupon.isActive, false);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'updated',
    coupon: {
      id: 'coupon-1',
      code: 'SAVE15',
      discountType: 'percentage',
      discountValue: 15,
      maxDiscount: null,
      minOrderAmount: 50,
      minQuantity: 2,
      validFrom: null,
      validUntil: '2026-05-31T23:59:59.000Z',
      validDays: null,
      validTimeFrom: '10:00',
      validTimeTo: '18:00',
      maxUses: 100,
      maxUsesPerCustomer: 2,
      currentUses: 0,
      firstOrderOnly: true,
      excludePromotional: true,
      deliveryTypeRestriction: 'delivery',
      applicableProductIds: ['product-9'],
      applicableCategoryIds: ['category-1'],
      applicableSectionIds: ['section-1'],
      isActive: false,
      createdAt: '2026-05-07T10:00:00.000Z',
      updatedAt: '2026-05-07T11:00:00.000Z',
    },
  });
});

test('returns duplicate without mutating or flushing when an updated code exists', async (): Promise<void> => {
  const coupon = persistedCoupon(true);
  const duplicate = persistedCoupon(true);
  duplicate.id = 'duplicate-coupon';
  const em = new FakeEntityManager(coupon, duplicate);
  const repository = new MikroOrmAdminCouponWriteRepository();

  const result = await repository.update(
    'coupon-1',
    CouponUpdatePatch.create({ code: 'save15' }),
    new MikroOrmTransactionContext(em as unknown as EntityManager),
  );

  assert.deepEqual(result, { status: 'duplicate-code' });
  assert.equal(coupon.code, 'SAVE10');
  assert.equal(em.flushCalls, 0);
});

test('returns not found without flushing when updating a missing coupon', async (): Promise<void> => {
  const em = new FakeEntityManager();
  const repository = new MikroOrmAdminCouponWriteRepository();

  const result = await repository.update(
    'missing-coupon',
    CouponUpdatePatch.create({ code: 'save15' }),
    new MikroOrmTransactionContext(em as unknown as EntityManager),
  );

  assert.deepEqual(em.findOneCalls, [{ entity: Coupon, where: { id: 'missing-coupon' } }]);
  assert.deepEqual(result, { status: 'not-found' });
  assert.equal(em.flushCalls, 0);
});

type FindOneWhere =
  | {
      readonly code: string;
    }
  | {
      readonly code: string;
      readonly id: { readonly $ne: string };
    }
  | {
      readonly id: string;
    };

type FindOneCall = {
  readonly entity: typeof Coupon;
  readonly where: FindOneWhere;
};

class FakeEntityManager {
  public readonly createdPayloads: CouponCreationData[] = [];
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls = 0;
  private readonly findOneResults: Array<Coupon | null>;

  public constructor(...findOneResults: Array<Coupon | null>) {
    this.findOneResults = findOneResults;
  }

  public async findOne(
    entity: typeof Coupon,
    where: FindOneWhere,
  ): Promise<Coupon | null> {
    this.findOneCalls.push({ entity, where });

    return this.findOneResults.length > 0 ? this.findOneResults.shift() ?? null : null;
  }

  public create(entity: typeof Coupon, payload: CouponCreationData): Coupon {
    assert.equal(entity, Coupon);
    this.createdPayloads.push(payload);

    const coupon = new Coupon();
    coupon.id = 'coupon-1';
    coupon.code = payload.code;
    coupon.discountType = payload.discountType;
    coupon.discountValue = payload.discountValue;
    coupon.maxDiscount = payload.maxDiscount;
    coupon.minOrderAmount = payload.minOrderAmount;
    coupon.minQuantity = payload.minQuantity;
    coupon.validFrom = payload.validFrom;
    coupon.validUntil = payload.validUntil;
    coupon.validDays = payload.validDays ? [...payload.validDays] : undefined;
    coupon.validTimeFrom = payload.validTimeFrom;
    coupon.validTimeTo = payload.validTimeTo;
    coupon.maxUses = payload.maxUses;
    coupon.maxUsesPerCustomer = payload.maxUsesPerCustomer;
    coupon.currentUses = payload.currentUses;
    coupon.firstOrderOnly = payload.firstOrderOnly;
    coupon.excludePromotional = payload.excludePromotional;
    coupon.deliveryTypeRestriction = payload.deliveryTypeRestriction;
    coupon.applicableProductIds = payload.applicableProductIds
      ? [...payload.applicableProductIds]
      : undefined;
    coupon.applicableCategoryIds = payload.applicableCategoryIds
      ? [...payload.applicableCategoryIds]
      : undefined;
    coupon.applicableSectionIds = payload.applicableSectionIds
      ? [...payload.applicableSectionIds]
      : undefined;
    coupon.isActive = payload.isActive;
    coupon.createdAt = new Date('2026-05-07T10:00:00.000Z');
    coupon.updatedAt = new Date('2026-05-07T11:00:00.000Z');

    return coupon;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}

function couponCreationData(): CouponCreationData {
  return {
    code: 'SAVE10',
    discountType: 'percentage',
    discountValue: '10.00',
    maxDiscount: '25.00',
    minOrderAmount: '50.00',
    minQuantity: 2,
    validFrom: new Date('2026-05-01T00:00:00.000Z'),
    validUntil: new Date('2026-05-31T23:59:59.000Z'),
    validDays: [1, 2, 3],
    validTimeFrom: '10:00',
    validTimeTo: '18:00',
    maxUses: 100,
    maxUsesPerCustomer: 2,
    currentUses: 0,
    firstOrderOnly: true,
    excludePromotional: true,
    deliveryTypeRestriction: 'delivery',
    applicableProductIds: ['product-1'],
    applicableCategoryIds: ['category-1'],
    applicableSectionIds: ['section-1'],
    isActive: true,
  };
}

function persistedCoupon(isActive: boolean): Coupon {
  const data = couponCreationData();
  const coupon = new Coupon();
  coupon.id = 'coupon-1';
  coupon.code = data.code;
  coupon.discountType = data.discountType;
  coupon.discountValue = data.discountValue;
  coupon.maxDiscount = data.maxDiscount;
  coupon.minOrderAmount = data.minOrderAmount;
  coupon.minQuantity = data.minQuantity;
  coupon.validFrom = data.validFrom;
  coupon.validUntil = data.validUntil;
  coupon.validDays = data.validDays ? [...data.validDays] : undefined;
  coupon.validTimeFrom = data.validTimeFrom;
  coupon.validTimeTo = data.validTimeTo;
  coupon.maxUses = data.maxUses;
  coupon.maxUsesPerCustomer = data.maxUsesPerCustomer;
  coupon.currentUses = data.currentUses;
  coupon.firstOrderOnly = data.firstOrderOnly;
  coupon.excludePromotional = data.excludePromotional;
  coupon.deliveryTypeRestriction = data.deliveryTypeRestriction;
  coupon.applicableProductIds = data.applicableProductIds
    ? [...data.applicableProductIds]
    : undefined;
  coupon.applicableCategoryIds = data.applicableCategoryIds
    ? [...data.applicableCategoryIds]
    : undefined;
  coupon.applicableSectionIds = data.applicableSectionIds
    ? [...data.applicableSectionIds]
    : undefined;
  coupon.isActive = isActive;
  coupon.createdAt = new Date('2026-05-07T10:00:00.000Z');
  coupon.updatedAt = new Date('2026-05-07T11:00:00.000Z');

  return coupon;
}
