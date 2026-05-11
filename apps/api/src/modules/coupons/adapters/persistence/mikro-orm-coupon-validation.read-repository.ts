import { EntityManager } from '@mikro-orm/postgresql';
import { Coupon, CouponUsage, Customer, Order, Product } from '../../../../entities';
import { ProductPricePolicy } from '../../../../shared/domain/product-price.policy';
import type {
  CouponValidationReadRepository,
  GetCouponValidationCustomerContextCommand,
} from '../../application/ports/coupon-validation.read-repository.port';
import type {
  CouponValidationCouponReadModel,
  CouponValidationCustomerContextReadModel,
  CouponValidationProductReadModel,
} from '../../application/read-models/coupon-validation.read-model';

export class MikroOrmCouponValidationReadRepository implements CouponValidationReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async findCouponByCode(
    code: string,
  ): Promise<CouponValidationCouponReadModel | null> {
    const em = this.em.fork();
    const coupon = await em.findOne(Coupon, { code });

    if (!coupon) {
      return null;
    }

    return this.toCouponReadModel(coupon);
  }

  public async getCustomerContext(
    command: GetCouponValidationCustomerContextCommand,
  ): Promise<CouponValidationCustomerContextReadModel> {
    if (!command.countUsage && !command.countOrders) {
      return {
        customerUsageCount: null,
        customerOrderCount: null,
      };
    }

    const em = this.em.fork();
    const customer = await em.findOne(Customer, { phone: command.customerPhone });

    if (!customer) {
      return {
        customerUsageCount: null,
        customerOrderCount: null,
      };
    }

    const coupon = em.getReference(Coupon, command.couponId);

    return {
      customerUsageCount: command.countUsage
        ? await em.count(CouponUsage, { coupon, customer })
        : null,
      customerOrderCount: command.countOrders ? await em.count(Order, { customer }) : null,
    };
  }

  public async findProductsByIds(
    productIds: readonly string[],
    at: Date,
  ): Promise<CouponValidationProductReadModel[]> {
    if (productIds.length === 0) {
      return [];
    }

    const em = this.em.fork();
    const products = await em.find(
      Product,
      { id: { $in: [...productIds] } },
      { populate: ['extras', 'category', 'optionGroups', 'optionGroups.options'] },
    );

    return products.map((product) => this.toProductReadModel(product, at));
  }

  private toCouponReadModel(coupon: Coupon): CouponValidationCouponReadModel {
    return {
      id: coupon.id,
      code: coupon.code,
      isActive: coupon.isActive,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      validDays: coupon.validDays,
      validTimeFrom: coupon.validTimeFrom,
      validTimeTo: coupon.validTimeTo,
      deliveryTypeRestriction: coupon.deliveryTypeRestriction,
      maxUses: coupon.maxUses,
      currentUses: coupon.currentUses,
      maxUsesPerCustomer: coupon.maxUsesPerCustomer,
      firstOrderOnly: coupon.firstOrderOnly,
      minQuantity: coupon.minQuantity,
      minOrderAmount: coupon.minOrderAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscount,
      applicableProductIds: coupon.applicableProductIds,
      applicableCategoryIds: coupon.applicableCategoryIds,
      excludePromotional: coupon.excludePromotional,
    };
  }

  private toProductReadModel(
    product: Product,
    at: Date,
  ): CouponValidationProductReadModel {
    return {
      id: product.id,
      categoryId: product.category.id,
      price: product.price,
      isPromotionActive: ProductPricePolicy.create(product).isPromotionActive(at),
      extras: product.extras.getItems().map((extra) => ({
        id: extra.id,
        price: extra.price,
      })),
      optionGroups: product.optionGroups.getItems().map((group) => ({
        id: group.id,
        options: group.options.getItems().map((option) => ({
          id: option.id,
          price: option.price,
        })),
      })),
    };
  }
}
