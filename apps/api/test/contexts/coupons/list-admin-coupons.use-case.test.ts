import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminCouponReadRepository } from '../../../src/modules/coupons/application/ports/admin-coupon.read-repository.port';
import type { AdminCouponReadModel } from '../../../src/modules/coupons/application/read-models/admin-coupon.read-model';
import { ListAdminCouponsUseCase } from '../../../src/modules/coupons/application/use-cases/list-admin-coupons.use-case';

test('lists admin coupons through the read repository', async (): Promise<void> => {
  const coupons = [adminCoupon()];
  const repository = new FakeAdminCouponReadRepository(coupons);
  const useCase = new ListAdminCouponsUseCase(repository);

  const result = await useCase.execute();

  assert.deepEqual(result, coupons);
  assert.equal(repository.calls, 1);
});

class FakeAdminCouponReadRepository implements AdminCouponReadRepository {
  public calls = 0;

  public constructor(private readonly coupons: readonly AdminCouponReadModel[]) {}

  public async listAll(): Promise<AdminCouponReadModel[]> {
    this.calls += 1;

    return [...this.coupons];
  }
}

function adminCoupon(): AdminCouponReadModel {
  return {
    id: 'coupon-1',
    code: 'SAVE10',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: null,
    minOrderAmount: 0,
    minQuantity: 0,
    validFrom: null,
    validUntil: null,
    validDays: null,
    validTimeFrom: null,
    validTimeTo: null,
    maxUses: 0,
    maxUsesPerCustomer: 0,
    currentUses: 0,
    firstOrderOnly: false,
    excludePromotional: false,
    deliveryTypeRestriction: null,
    applicableProductIds: null,
    applicableCategoryIds: null,
    applicableSectionIds: null,
    isActive: true,
    createdAt: '2026-05-07T10:00:00.000Z',
    updatedAt: '2026-05-07T11:00:00.000Z',
  };
}
