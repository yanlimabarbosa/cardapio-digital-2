import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ValidateCouponCommand,
  ValidateCouponResult,
  ValidateCouponUseCase,
} from '../../../src/modules/coupons/application/use-cases/validate-coupon.use-case';
import { ValidateCouponUseCaseOrderCouponValidator } from '../../../src/modules/orders/adapters/coupons/validate-coupon-use-case-order-coupon.validator';

test('maps valid coupon validation into the order coupon port', async (): Promise<void> => {
  const useCase = new FakeValidateCouponUseCase({
    valid: true,
    coupon: {
      id: 'coupon-1',
      code: 'SAVE2',
      discountType: 'fixed',
      discountValue: '2.34',
    },
    calculatedDiscount: 2.34,
    eligibleAmount: 25,
  });

  const validator = new ValidateCouponUseCaseOrderCouponValidator(
    useCase as unknown as ValidateCouponUseCase,
  );
  const result = await validator.validate({
    code: 'SAVE2',
    deliveryType: 'pickup',
    customerPhone: '81999999999',
    items: [
      {
        productId: 'product-1',
        quantity: 2,
        extraIds: ['extra-1'],
        optionSelections: [
          {
            groupId: 'group-1',
            optionIds: ['option-1'],
          },
        ],
      },
    ],
  });

  assert.deepEqual(result, {
    valid: true,
    coupon: {
      id: 'coupon-1',
      code: 'SAVE2',
    },
    discountCents: 234,
    discountAmount: '2.34',
  });
  assert.deepEqual(useCase.command, {
    code: 'SAVE2',
    deliveryType: 'pickup',
    customerPhone: '81999999999',
    items: [
      {
        productId: 'product-1',
        quantity: 2,
        extraIds: ['extra-1'],
        optionSelections: [
          {
            groupId: 'group-1',
            optionIds: ['option-1'],
          },
        ],
      },
    ],
  });
});

test('maps rejected coupon validation into the order coupon port', async (): Promise<void> => {
  const useCase = new FakeValidateCouponUseCase({
    valid: false,
    reason: 'Cupom expirado',
  });
  const validator = new ValidateCouponUseCaseOrderCouponValidator(
    useCase as unknown as ValidateCouponUseCase,
  );

  const result = await validator.validate({
    code: 'OLD',
    deliveryType: 'delivery',
    customerPhone: '81999999999',
    items: [],
  });

  assert.deepEqual(result, {
    valid: false,
    reason: 'Cupom expirado',
  });
});

class FakeValidateCouponUseCase {
  public command?: ValidateCouponCommand;

  public constructor(private readonly result: ValidateCouponResult) {}

  public async execute(command: ValidateCouponCommand): Promise<ValidateCouponResult> {
    this.command = command;

    return this.result;
  }
}
