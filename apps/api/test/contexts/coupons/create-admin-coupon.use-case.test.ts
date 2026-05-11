import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminCouponDuplicateCodeError } from '../../../src/modules/coupons/application/errors/admin-coupon.errors';
import type {
  AdminCouponWriteRepository,
  CreateAdminCouponResult,
  ToggleAdminCouponActiveResult,
  UpdateAdminCouponResult,
} from '../../../src/modules/coupons/application/ports/admin-coupon-write.repository.port';
import type { AdminCouponReadModel } from '../../../src/modules/coupons/application/read-models/admin-coupon.read-model';
import type { CouponCreationData } from '../../../src/modules/coupons/domain/coupon-creation-draft.value-object';
import type { CouponUpdatePatch } from '../../../src/modules/coupons/domain/coupon-update-patch.value-object';
import { CreateAdminCouponUseCase } from '../../../src/modules/coupons/application/use-cases/create-admin-coupon.use-case';

const context: TransactionContext = { contextName: 'test' };

test('creates an admin coupon inside a unit of work', async (): Promise<void> => {
  const repository = new FakeAdminCouponWriteRepository({
    status: 'created',
    coupon: adminCoupon(),
  });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new CreateAdminCouponUseCase(unitOfWork, repository);

  const result = await useCase.execute({
    code: 'save10',
    discountType: 'percentage',
    discountValue: 10,
  });

  assert.deepEqual(result, adminCoupon());
  assert.equal(unitOfWork.calls, 1);
  assert.deepEqual(repository.commands, [
    {
      data: {
        code: 'SAVE10',
        discountType: 'percentage',
        discountValue: '10.00',
        maxDiscount: undefined,
        minOrderAmount: '0',
        minQuantity: 0,
        validFrom: undefined,
        validUntil: undefined,
        validDays: undefined,
        validTimeFrom: undefined,
        validTimeTo: undefined,
        maxUses: 0,
        maxUsesPerCustomer: 0,
        currentUses: 0,
        firstOrderOnly: false,
        excludePromotional: false,
        deliveryTypeRestriction: undefined,
        applicableProductIds: undefined,
        applicableCategoryIds: undefined,
        applicableSectionIds: undefined,
        isActive: true,
      },
      context,
    },
  ]);
});

test('throws an application error when the coupon code already exists', async (): Promise<void> => {
  const repository = new FakeAdminCouponWriteRepository({ status: 'duplicate-code' });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new CreateAdminCouponUseCase(unitOfWork, repository);

  await assert.rejects(
    () =>
      useCase.execute({
        code: 'save10',
        discountType: 'percentage',
        discountValue: 10,
      }),
    AdminCouponDuplicateCodeError,
  );
  assert.equal(unitOfWork.calls, 1);
});

type CreateCommand = {
  readonly context: TransactionContext;
  readonly data: CouponCreationData;
};

class FakeUnitOfWork implements UnitOfWork {
  public calls = 0;

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.calls += 1;

    return work(context);
  }
}

class FakeAdminCouponWriteRepository implements AdminCouponWriteRepository {
  public readonly commands: CreateCommand[] = [];

  public constructor(private readonly result: CreateAdminCouponResult) {}

  public async create(
    data: CouponCreationData,
    transactionContext: TransactionContext,
  ): Promise<CreateAdminCouponResult> {
    this.commands.push({ data, context: transactionContext });

    return this.result;
  }

  public async update(
    id: string,
    patch: CouponUpdatePatch,
    transactionContext: TransactionContext,
  ): Promise<UpdateAdminCouponResult> {
    throw new Error(
      `Unexpected update(${id}, ${patch.changedFields().join(',')}, ${
        transactionContext.contextName
      }) in create test`,
    );
  }

  public async toggleActive(
    id: string,
    transactionContext: TransactionContext,
  ): Promise<ToggleAdminCouponActiveResult> {
    throw new Error(
      `Unexpected toggleActive(${id}, ${transactionContext.contextName}) in create test`,
    );
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
