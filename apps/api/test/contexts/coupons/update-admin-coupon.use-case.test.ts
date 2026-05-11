import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import {
  AdminCouponDuplicateCodeError,
  AdminCouponNotFoundError,
} from '../../../src/modules/coupons/application/errors/admin-coupon.errors';
import type {
  AdminCouponWriteRepository,
  CreateAdminCouponResult,
  ToggleAdminCouponActiveResult,
  UpdateAdminCouponResult,
} from '../../../src/modules/coupons/application/ports/admin-coupon-write.repository.port';
import type { AdminCouponReadModel } from '../../../src/modules/coupons/application/read-models/admin-coupon.read-model';
import type { CouponCreationData } from '../../../src/modules/coupons/domain/coupon-creation-draft.value-object';
import type { CouponUpdatePatch } from '../../../src/modules/coupons/domain/coupon-update-patch.value-object';
import { UpdateAdminCouponUseCase } from '../../../src/modules/coupons/application/use-cases/update-admin-coupon.use-case';

const context: TransactionContext = { contextName: 'test' };

test('updates an admin coupon inside a unit of work', async (): Promise<void> => {
  const repository = new FakeAdminCouponWriteRepository({
    status: 'updated',
    coupon: adminCoupon(),
  });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new UpdateAdminCouponUseCase(unitOfWork, repository);

  const result = await useCase.execute('coupon-1', {
    code: 'save15',
    discountValue: 15,
    maxDiscount: null,
    validFrom: null,
    applicableProductIds: ['product-1'],
    isActive: false,
  });

  assert.deepEqual(result, adminCoupon());
  assert.equal(unitOfWork.calls, 1);
  assert.equal(repository.updateCommands.length, 1);
  assert.equal(repository.updateCommands[0].id, 'coupon-1');
  assert.equal(repository.updateCommands[0].context, context);
  assert.deepEqual(repository.updateCommands[0].patch.changedFields(), [
    'code',
    'discountValue',
    'maxDiscount',
    'validFrom',
    'applicableProductIds',
    'isActive',
  ]);
  assert.deepEqual(repository.updateCommands[0].patch.toData(), {
    code: 'SAVE15',
    discountValue: '15.00',
    maxDiscount: undefined,
    validFrom: undefined,
    applicableProductIds: ['product-1'],
    applicableCategoryIds: undefined,
    applicableSectionIds: undefined,
    validDays: undefined,
    isActive: false,
  });
});

test('throws an application error when the coupon is missing', async (): Promise<void> => {
  const repository = new FakeAdminCouponWriteRepository({ status: 'not-found' });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new UpdateAdminCouponUseCase(unitOfWork, repository);

  await assert.rejects(
    () => useCase.execute('missing-coupon', { code: 'save15' }),
    AdminCouponNotFoundError,
  );
  assert.equal(unitOfWork.calls, 1);
});

test('throws an application error when the normalized code already exists', async (): Promise<void> => {
  const repository = new FakeAdminCouponWriteRepository({ status: 'duplicate-code' });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new UpdateAdminCouponUseCase(unitOfWork, repository);

  await assert.rejects(
    () => useCase.execute('coupon-1', { code: 'save15' }),
    AdminCouponDuplicateCodeError,
  );
  assert.equal(unitOfWork.calls, 1);
});

type UpdateCommand = {
  readonly context: TransactionContext;
  readonly id: string;
  readonly patch: CouponUpdatePatch;
};

class FakeUnitOfWork implements UnitOfWork {
  public calls = 0;

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.calls += 1;

    return work(context);
  }
}

class FakeAdminCouponWriteRepository implements AdminCouponWriteRepository {
  public readonly updateCommands: UpdateCommand[] = [];

  public constructor(private readonly updateResult: UpdateAdminCouponResult) {}

  public async create(
    data: CouponCreationData,
    transactionContext: TransactionContext,
  ): Promise<CreateAdminCouponResult> {
    throw new Error(
      `Unexpected create(${data.code}, ${transactionContext.contextName}) in update test`,
    );
  }

  public async update(
    id: string,
    patch: CouponUpdatePatch,
    transactionContext: TransactionContext,
  ): Promise<UpdateAdminCouponResult> {
    this.updateCommands.push({ id, patch, context: transactionContext });

    return this.updateResult;
  }

  public async toggleActive(
    id: string,
    transactionContext: TransactionContext,
  ): Promise<ToggleAdminCouponActiveResult> {
    throw new Error(
      `Unexpected toggleActive(${id}, ${transactionContext.contextName}) in update test`,
    );
  }
}

function adminCoupon(): AdminCouponReadModel {
  return {
    id: 'coupon-1',
    code: 'SAVE15',
    discountType: 'percentage',
    discountValue: 15,
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
    applicableProductIds: ['product-1'],
    applicableCategoryIds: null,
    applicableSectionIds: null,
    isActive: false,
    createdAt: '2026-05-07T10:00:00.000Z',
    updatedAt: '2026-05-07T11:00:00.000Z',
  };
}
