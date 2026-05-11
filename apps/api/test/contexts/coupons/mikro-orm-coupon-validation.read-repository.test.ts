import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCouponValidationReadRepository } from '../../../src/modules/coupons/adapters/persistence/mikro-orm-coupon-validation.read-repository';
import { Category, Coupon, CouponUsage, Customer, OptionGroup, Order, Product, ProductExtra } from '../../../src/entities';

const NOW = new Date('2026-05-07T15:00:00.000Z');

test('finds a coupon by code and maps validation fields', async (): Promise<void> => {
  const coupon = createCoupon();
  const em = new FakeEntityManager({ coupon });
  const repository = new MikroOrmCouponValidationReadRepository(em as unknown as EntityManager);

  const result = await repository.findCouponByCode('SAVE10');

  assert.deepEqual(em.findOneCalls, [{ entity: Coupon, where: { code: 'SAVE10' } }]);
  assert.deepEqual(result, {
    id: 'coupon-1',
    code: 'SAVE10',
    isActive: true,
    validFrom: undefined,
    validUntil: undefined,
    validDays: [1, 2],
    validTimeFrom: '11:00',
    validTimeTo: '21:00',
    deliveryTypeRestriction: 'delivery',
    maxUses: 20,
    currentUses: 3,
    maxUsesPerCustomer: 2,
    firstOrderOnly: true,
    minQuantity: 1,
    minOrderAmount: '10.00',
    discountType: 'percentage',
    discountValue: '10.00',
    maxDiscount: '5.00',
    applicableProductIds: ['product-1'],
    applicableCategoryIds: ['category-1'],
    excludePromotional: true,
  });
});

test('loads customer coupon usage and order counts only when requested', async (): Promise<void> => {
  const customer = createCustomer();
  const em = new FakeEntityManager({ customer, usageCount: 2, orderCount: 4 });
  const repository = new MikroOrmCouponValidationReadRepository(em as unknown as EntityManager);

  const result = await repository.getCustomerContext({
    couponId: 'coupon-1',
    customerPhone: '81999990000',
    countUsage: true,
    countOrders: true,
  });

  assert.deepEqual(result, {
    customerUsageCount: 2,
    customerOrderCount: 4,
  });
  assert.deepEqual(em.findOneCalls, [
    { entity: Customer, where: { phone: '81999990000' } },
  ]);
  assert.deepEqual(em.countCalls, [
    {
      entity: CouponUsage,
      where: { couponId: 'coupon-1', customerId: 'customer-1' },
    },
    {
      entity: Order,
      where: { customerId: 'customer-1' },
    },
  ]);
});

test('maps product prices, flat extras, grouped options, and promotion activity', async (): Promise<void> => {
  const product = createProduct();
  const em = new FakeEntityManager({ products: [product] });
  const repository = new MikroOrmCouponValidationReadRepository(em as unknown as EntityManager);

  const result = await repository.findProductsByIds(['product-1'], NOW);

  assert.deepEqual(em.findCalls, [
    {
      entity: Product,
      where: { id: { $in: ['product-1'] } },
      options: { populate: ['extras', 'category', 'optionGroups', 'optionGroups.options'] },
    },
  ]);
  assert.deepEqual(result, [
    {
      id: 'product-1',
      categoryId: 'category-1',
      price: '17.50',
      isPromotionActive: true,
      extras: [
        { id: 'extra-1', price: '2.50' },
        { id: 'option-1', price: '5.00' },
      ],
      optionGroups: [
        {
          id: 'group-1',
          options: [{ id: 'option-1', price: '5.00' }],
        },
      ],
    },
  ]);
});

type FakeEntityManagerOptions = {
  readonly coupon?: Coupon | null;
  readonly customer?: Customer | null;
  readonly orderCount?: number;
  readonly products?: readonly Product[];
  readonly usageCount?: number;
};

type FindOneCall =
  | { readonly entity: typeof Coupon; readonly where: { readonly code: string } }
  | { readonly entity: typeof Customer; readonly where: { readonly phone: string } };

type CountCall =
  | {
      readonly entity: typeof CouponUsage;
      readonly where: { readonly couponId: string; readonly customerId: string };
    }
  | {
      readonly entity: typeof Order;
      readonly where: { readonly customerId: string };
    };

type ProductFindCall = {
  readonly entity: typeof Product;
  readonly options: { readonly populate: readonly string[] };
  readonly where: { readonly id: { readonly $in: readonly string[] } };
};

class FakeEntityManager {
  public readonly countCalls: CountCall[] = [];
  public readonly findCalls: ProductFindCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];

  public constructor(private readonly options: FakeEntityManagerOptions) {}

  public fork(): this {
    return this;
  }

  public async findOne(
    entity: typeof Coupon,
    where: { readonly code: string },
  ): Promise<Coupon | null>;
  public async findOne(
    entity: typeof Customer,
    where: { readonly phone: string },
  ): Promise<Customer | null>;
  public async findOne(
    entity: typeof Coupon | typeof Customer,
    where: { readonly code: string } | { readonly phone: string },
  ): Promise<Coupon | Customer | null> {
    if (entity === Coupon) {
      this.findOneCalls.push({ entity, where: where as { readonly code: string } });

      return this.options.coupon ?? null;
    }

    this.findOneCalls.push({
      entity: Customer,
      where: where as { readonly phone: string },
    });

    return this.options.customer ?? null;
  }

  public getReference(entity: typeof Coupon, id: string): Coupon {
    const coupon = new entity();
    coupon.id = id;

    return coupon;
  }

  public async count(
    entity: typeof CouponUsage,
    where: { readonly coupon: Coupon; readonly customer: Customer },
  ): Promise<number>;
  public async count(
    entity: typeof Order,
    where: { readonly customer: Customer },
  ): Promise<number>;
  public async count(
    entity: typeof CouponUsage | typeof Order,
    where: { readonly coupon?: Coupon; readonly customer: Customer },
  ): Promise<number> {
    if (entity === CouponUsage) {
      this.countCalls.push({
        entity,
        where: {
          couponId: where.coupon?.id ?? 'missing-coupon',
          customerId: where.customer.id,
        },
      });

      return this.options.usageCount ?? 0;
    }

    this.countCalls.push({
      entity: Order,
      where: { customerId: where.customer.id },
    });

    return this.options.orderCount ?? 0;
  }

  public async find(
    entity: typeof Product,
    where: { readonly id: { readonly $in: readonly string[] } },
    options: { readonly populate: readonly string[] },
  ): Promise<Product[]> {
    this.findCalls.push({ entity, where, options });

    return [...(this.options.products ?? [])];
  }
}

function createCoupon(): Coupon {
  const coupon = new Coupon();
  coupon.id = 'coupon-1';
  coupon.code = 'SAVE10';
  coupon.discountType = 'percentage';
  coupon.discountValue = '10.00';
  coupon.maxDiscount = '5.00';
  coupon.minOrderAmount = '10.00';
  coupon.minQuantity = 1;
  coupon.validFrom = undefined;
  coupon.validUntil = undefined;
  coupon.validDays = [1, 2];
  coupon.validTimeFrom = '11:00';
  coupon.validTimeTo = '21:00';
  coupon.deliveryTypeRestriction = 'delivery';
  coupon.maxUses = 20;
  coupon.maxUsesPerCustomer = 2;
  coupon.currentUses = 3;
  coupon.firstOrderOnly = true;
  coupon.excludePromotional = true;
  coupon.applicableProductIds = ['product-1'];
  coupon.applicableCategoryIds = ['category-1'];
  coupon.isActive = true;

  return coupon;
}

function createCustomer(): Customer {
  const customer = new Customer();
  customer.id = 'customer-1';
  customer.phone = '81999990000';

  return customer;
}

function createProduct(): Product {
  const category = new Category();
  category.id = 'category-1';
  category.name = 'Meals';

  const product = new Product();
  product.id = 'product-1';
  product.category = category;
  product.name = 'Lunch';
  product.price = '17.50';
  product.isPromotional = true;
  product.promotionalPrice = '15.00';
  product.promotionStartDate = new Date('2026-05-07T10:00:00.000Z');
  product.promotionEndDate = new Date('2026-05-07T20:00:00.000Z');

  const flatExtra = createExtra('extra-1', '2.50', product);
  const optionGroup = createOptionGroup(product);
  const option = createExtra('option-1', '5.00', product, optionGroup);
  product.extras = createCollection([flatExtra, option]) as unknown as Product['extras'];
  optionGroup.options = createCollection([option]) as unknown as OptionGroup['options'];
  product.optionGroups = createCollection([optionGroup]) as unknown as Product['optionGroups'];

  return product;
}

function createOptionGroup(product: Product): OptionGroup {
  const group = new OptionGroup();
  group.id = 'group-1';
  group.name = 'Protein';
  group.product = product;

  return group;
}

function createExtra(
  id: string,
  price: string,
  product: Product,
  optionGroup?: OptionGroup,
): ProductExtra {
  const extra = new ProductExtra();
  extra.id = id;
  extra.name = id;
  extra.price = price;
  extra.product = product;
  extra.optionGroup = optionGroup;

  return extra;
}

function createCollection<T>(items: readonly T[]): FakeCollection<T> {
  return new FakeCollection(items);
}

class FakeCollection<T> {
  public constructor(private readonly items: readonly T[]) {}

  public getItems(): T[] {
    return [...this.items];
  }
}
