import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminCouponNotFoundError } from '../../../src/modules/coupons/application/errors/admin-coupon.errors';
import type {
  AdminCouponWriteRepository,
  CreateAdminCouponResult,
  ToggleAdminCouponActiveResult,
  UpdateAdminCouponResult,
} from '../../../src/modules/coupons/application/ports/admin-coupon-write.repository.port';
import type { AdminCouponReadModel } from '../../../src/modules/coupons/application/read-models/admin-coupon.read-model';
import type { CouponCreationData } from '../../../src/modules/coupons/domain/coupon-creation-draft.value-object';
import type { CouponUpdatePatch } from '../../../src/modules/coupons/domain/coupon-update-patch.value-object';
import { ToggleAdminCouponActiveUseCase } from '../../../src/modules/coupons/application/use-cases/toggle-admin-coupon-active.use-case';

const context: TransactionContext = { contextName: 'test' };

test('toggles an admin coupon active state inside a unit of work', async (): Promise<void> => {
  const repository = new FakeAdminCouponWriteRepository({
    status: 'updated',
    coupon: adminCoupon(false),
  });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new ToggleAdminCouponActiveUseCase(unitOfWork, repository);

  const result = await useCase.execute('coupon-1');

  assert.deepEqual(result, adminCoupon(false));
  assert.equal(unitOfWork.calls, 1);
  assert.deepEqual(repository.toggleCommands, [{ id: 'coupon-1', context }]);
});

test('throws an application error when the coupon is missing', async (): Promise<void> => {
  const repository = new FakeAdminCouponWriteRepository({ status: 'not-found' });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new ToggleAdminCouponActiveUseCase(unitOfWork, repository);

  await assert.rejects(() => useCase.execute('missing-coupon'), AdminCouponNotFoundError);
  assert.equal(unitOfWork.calls, 1);
  assert.deepEqual(repository.toggleCommands, [{ id: 'missing-coupon', context }]);
});

type ToggleCommand = {
  readonly context: TransactionContext;
  readonly id: string;
};

class FakeUnitOfWork implements UnitOfWork {
  public calls = 0;

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.calls += 1;

    return work(context);
  }
}

class FakeAdminCouponWriteRepository implements AdminCouponWriteRepository {
  public readonly toggleCommands: ToggleCommand[] = [];

  public constructor(private readonly toggleResult: ToggleAdminCouponActiveResult) {}

  public async create(
    data: CouponCreationData,
    transactionContext: TransactionContext,
  ): Promise<CreateAdminCouponResult> {
    throw new Error(
      `Unexpected create(${data.code}, ${transactionContext.contextName}) in toggle test`,
    );
  }

  public async update(
    id: string,
    patch: CouponUpdatePatch,
    transactionContext: TransactionContext,
  ): Promise<UpdateAdminCouponResult> {
    throw new Error(
      `Unexpected update(${id}, ${patch.changedFields().join(',')}, ${
        transactionContext.contextName
      }) in toggle test`,
    );
  }

  public async toggleActive(
    id: string,
    transactionContext: TransactionContext,
  ): Promise<ToggleAdminCouponActiveResult> {
    this.toggleCommands.push({ id, context: transactionContext });

    return this.toggleResult;
  }
}

function adminCoupon(isActive: boolean): AdminCouponReadModel {
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
    isActive,
    createdAt: '2026-05-07T10:00:00.000Z',
    updatedAt: '2026-05-07T11:00:00.000Z',
  };
}
