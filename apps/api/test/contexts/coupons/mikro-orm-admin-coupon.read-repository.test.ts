import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmAdminCouponReadRepository } from '../../../src/modules/coupons/adapters/persistence/mikro-orm-admin-coupon.read-repository';
import { Coupon } from '../../../src/entities';

test('lists admin coupons with the legacy ordering and response shape', async (): Promise<void> => {
  const coupon = createCoupon();
  const em = new FakeEntityManager([coupon]);
  const repository = new MikroOrmAdminCouponReadRepository(em as unknown as EntityManager);

  const result = await repository.listAll();

  assert.deepEqual(em.findCalls, [
    {
      entity: Coupon,
      where: {},
      options: { orderBy: { createdAt: 'DESC' } },
    },
  ]);
  assert.deepEqual(result, [
    {
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
      currentUses: 7,
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
  ]);
});

type FindCall = {
  readonly entity: typeof Coupon;
  readonly options: { readonly orderBy: { readonly createdAt: 'DESC' } };
  readonly where: Record<string, never>;
};

class FakeEntityManager {
  public readonly findCalls: FindCall[] = [];

  public constructor(private readonly coupons: readonly Coupon[]) {}

  public fork(): FakeEntityManager {
    return this;
  }

  public async find(
    entity: typeof Coupon,
    where: Record<string, never>,
    options: { readonly orderBy: { readonly createdAt: 'DESC' } },
  ): Promise<Coupon[]> {
    this.findCalls.push({ entity, where, options });

    return [...this.coupons];
  }
}

function createCoupon(): Coupon {
  const coupon = new Coupon();
  coupon.id = 'coupon-1';
  coupon.code = 'SAVE10';
  coupon.discountType = 'percentage';
  coupon.discountValue = '10.00';
  coupon.maxDiscount = '25.00';
  coupon.minOrderAmount = '50.00';
  coupon.minQuantity = 2;
  coupon.validFrom = new Date('2026-05-01T00:00:00.000Z');
  coupon.validUntil = new Date('2026-05-31T23:59:59.000Z');
  coupon.validDays = [1, 2, 3];
  coupon.validTimeFrom = '10:00';
  coupon.validTimeTo = '18:00';
  coupon.maxUses = 100;
  coupon.maxUsesPerCustomer = 2;
  coupon.currentUses = 7;
  coupon.firstOrderOnly = true;
  coupon.excludePromotional = true;
  coupon.deliveryTypeRestriction = 'delivery';
  coupon.applicableProductIds = ['product-1'];
  coupon.applicableCategoryIds = ['category-1'];
  coupon.applicableSectionIds = ['section-1'];
  coupon.isActive = true;
  coupon.createdAt = new Date('2026-05-07T10:00:00.000Z');
  coupon.updatedAt = new Date('2026-05-07T11:00:00.000Z');

  return coupon;
}
