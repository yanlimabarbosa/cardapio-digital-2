import {
  type ValidateCouponItemCommand,
  ValidateCouponUseCase,
} from '../../../../modules/coupons/application/use-cases/validate-coupon.use-case';
import {
  type OrderCouponItemInput,
  type OrderCouponValidationResult,
  type OrderCouponValidator,
  type ValidateOrderCouponCommand,
} from '../../application/ports/order-coupon.port';

export class ValidateCouponUseCaseOrderCouponValidator implements OrderCouponValidator {
  public constructor(private readonly validateCouponUseCase: ValidateCouponUseCase) {}

  public async validate(command: ValidateOrderCouponCommand): Promise<OrderCouponValidationResult> {
    const result = await this.validateCouponUseCase.execute({
      code: command.code,
      items: this.toCouponItems(command.items),
      deliveryType: command.deliveryType,
      customerPhone: command.customerPhone,
    });

    if (!result.valid) {
      return {
        valid: false,
        reason: result.reason,
      };
    }

    return {
      valid: true,
      coupon: {
        id: result.coupon.id,
        code: result.coupon.code,
      },
      discountCents: Math.round(result.calculatedDiscount * 100),
      discountAmount: result.calculatedDiscount.toFixed(2),
    };
  }

  private toCouponItems(items: readonly OrderCouponItemInput[]): ValidateCouponItemCommand[] {
    return items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      extraIds: item.extraIds ? [...item.extraIds] : undefined,
      optionSelections: item.optionSelections?.map((selection) => ({
        groupId: selection.groupId,
        optionIds: [...selection.optionIds],
      })),
    }));
  }
}
