import assert from 'node:assert/strict';
import test from 'node:test';
import type { Clock } from '../../../src/shared/application/clock/clock.port';
import type {
  CouponValidationReadRepository,
  GetCouponValidationCustomerContextCommand,
} from '../../../src/modules/coupons/application/ports/coupon-validation.read-repository.port';
import type {
  CouponValidationCouponReadModel,
  CouponValidationCustomerContextReadModel,
  CouponValidationProductReadModel,
} from '../../../src/modules/coupons/application/read-models/coupon-validation.read-model';
import { ValidateCouponUseCase } from '../../../src/modules/coupons/application/use-cases/validate-coupon.use-case';

const NOW = new Date('2026-05-07T15:00:00.000Z');

test('validates a coupon and calculates the discount from eligible products', async (): Promise<void> => {
  const repository = new FakeCouponValidationReadRepository({
    coupon: coupon({ discountType: 'percentage', discountValue: '10.00' }),
    products: [product()],
  });
  const useCase = new ValidateCouponUseCase(repository, new FakeClock(NOW));

  const result = await useCase.execute({
    code: 'save10',
    deliveryType: 'delivery',
    customerPhone: '81999990000',
    items: [{ productId: 'product-1', quantity: 2, extraIds: ['extra-1'] }],
  });

  assert.deepEqual(result, {
    valid: true,
    coupon: {
      id: 'coupon-1',
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: '10.00',
    },
    calculatedDiscount: 4,
    eligibleAmount: 40,
  });
  assert.deepEqual(repository.codes, ['SAVE10']);
  assert.deepEqual(repository.customerContextCommands, [
    {
      couponId: 'coupon-1',
      customerPhone: '81999990000',
      countUsage: false,
      countOrders: false,
    },
  ]);
  assert.deepEqual(repository.productRequests, [{ productIds: ['product-1'], at: NOW }]);
});

test('returns the legacy inactive reason when the coupon is missing', async (): Promise<void> => {
  const repository = new FakeCouponValidationReadRepository({ coupon: null });
  const useCase = new ValidateCouponUseCase(repository, new FakeClock(NOW));

  const result = await useCase.execute({
    code: 'missing',
    deliveryType: 'delivery',
    customerPhone: '81999990000',
    items: [{ productId: 'product-1', quantity: 1 }],
  });

  assert.deepEqual(result, {
    valid: false,
    reason: 'Cupom não encontrado ou inativo',
  });
  assert.deepEqual(repository.customerContextCommands, []);
  assert.deepEqual(repository.productRequests, []);
});

test('stops before product lookup when customer restrictions reject the coupon', async (): Promise<void> => {
  const repository = new FakeCouponValidationReadRepository({
    coupon: coupon({ maxUsesPerCustomer: 1 }),
    customerContext: {
      customerUsageCount: 1,
      customerOrderCount: null,
    },
  });
  const useCase = new ValidateCouponUseCase(repository, new FakeClock(NOW));

  const result = await useCase.execute({
    code: 'SAVE10',
    deliveryType: 'delivery',
    customerPhone: '81999990000',
    items: [{ productId: 'product-1', quantity: 1 }],
  });

  assert.deepEqual(result, {
    valid: false,
    reason: 'Você já atingiu o limite de uso deste cupom',
  });
  assert.deepEqual(repository.productRequests, []);
});

test('returns the legacy no eligible items reason when products do not match restrictions', async (): Promise<void> => {
  const repository = new FakeCouponValidationReadRepository({
    coupon: coupon({ applicableProductIds: ['product-2'] }),
    products: [product()],
  });
  const useCase = new ValidateCouponUseCase(repository, new FakeClock(NOW));

  const result = await useCase.execute({
    code: 'SAVE10',
    deliveryType: 'delivery',
    customerPhone: '81999990000',
    items: [{ productId: 'product-1', quantity: 1 }],
  });

  assert.deepEqual(result, {
    valid: false,
    reason: 'Nenhum item elegível para desconto',
  });
});

type FakeCouponRepositoryOptions = {
  readonly coupon: CouponValidationCouponReadModel | null;
  readonly customerContext?: CouponValidationCustomerContextReadModel;
  readonly products?: readonly CouponValidationProductReadModel[];
};

type ProductRequest = {
  readonly at: Date;
  readonly productIds: readonly string[];
};

class FakeCouponValidationReadRepository implements CouponValidationReadRepository {
  public readonly codes: string[] = [];
  public readonly customerContextCommands: GetCouponValidationCustomerContextCommand[] = [];
  public readonly productRequests: ProductRequest[] = [];

  public constructor(private readonly options: FakeCouponRepositoryOptions) {}

  public async findCouponByCode(
    code: string,
  ): Promise<CouponValidationCouponReadModel | null> {
    this.codes.push(code);

    return this.options.coupon;
  }

  public async getCustomerContext(
    command: GetCouponValidationCustomerContextCommand,
  ): Promise<CouponValidationCustomerContextReadModel> {
    this.customerContextCommands.push(command);

    return this.options.customerContext ?? {
      customerUsageCount: null,
      customerOrderCount: null,
    };
  }

  public async findProductsByIds(
    productIds: readonly string[],
    at: Date,
  ): Promise<CouponValidationProductReadModel[]> {
    this.productRequests.push({ productIds, at });

    return [...(this.options.products ?? [])];
  }
}

class FakeClock implements Clock {
  public constructor(private readonly date: Date) {}

  public now(): Date {
    return this.date;
  }
}

function coupon(
  overrides: Partial<CouponValidationCouponReadModel> = {},
): CouponValidationCouponReadModel {
  return {
    id: overrides.id ?? 'coupon-1',
    code: overrides.code ?? 'SAVE10',
    discountType: overrides.discountType ?? 'percentage',
    discountValue: overrides.discountValue ?? '10.00',
    maxDiscount: overrides.maxDiscount ?? null,
    minOrderAmount: overrides.minOrderAmount ?? '0',
    minQuantity: overrides.minQuantity ?? 0,
    validFrom: overrides.validFrom ?? null,
    validUntil: overrides.validUntil ?? null,
    validDays: overrides.validDays ?? null,
    validTimeFrom: overrides.validTimeFrom ?? null,
    validTimeTo: overrides.validTimeTo ?? null,
    deliveryTypeRestriction: overrides.deliveryTypeRestriction ?? null,
    maxUses: overrides.maxUses ?? 0,
    currentUses: overrides.currentUses ?? 0,
    maxUsesPerCustomer: overrides.maxUsesPerCustomer ?? 0,
    firstOrderOnly: overrides.firstOrderOnly ?? false,
    applicableProductIds: overrides.applicableProductIds ?? null,
    applicableCategoryIds: overrides.applicableCategoryIds ?? null,
    excludePromotional: overrides.excludePromotional ?? false,
    isActive: overrides.isActive ?? true,
  };
}

function product(
  overrides: Partial<CouponValidationProductReadModel> = {},
): CouponValidationProductReadModel {
  return {
    id: overrides.id ?? 'product-1',
    categoryId: overrides.categoryId ?? 'category-1',
    price: overrides.price ?? '17.50',
    isPromotionActive: overrides.isPromotionActive ?? false,
    extras: overrides.extras ?? [{ id: 'extra-1', price: '2.50' }],
    optionGroups: overrides.optionGroups ?? [],
  };
}
