import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCustomerRedeemableProductsReadRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-redeemable-products.read-repository';
import { Customer, Product } from '../../../src/entities';

test('gets active redeemable product records for an active customer', async (): Promise<void> => {
  const customer = createCustomer('customer-1', 100);
  const products = [
    createProduct({
      id: 'product-1',
      name: 'Brownie',
      imageUrl: 'https://example.com/brownie.png',
      price: '12.50',
      redemptionCost: 80,
    }),
    createProduct({
      id: 'product-2',
      name: 'Cafe',
      imageUrl: undefined,
      price: '8.00',
      redemptionCost: undefined,
    }),
  ];
  const em = new FakeEntityManager(customer, products);
  const repository = new MikroOrmCustomerRedeemableProductsReadRepository(em as unknown as EntityManager);

  const result = await repository.getByCustomerId('customer-1');

  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { id: 'customer-1', isActive: true },
    },
  ]);
  assert.deepEqual(em.findCalls, [
    {
      entity: Product,
      where: { isRedeemable: true, isActive: true },
      options: { orderBy: { name: 'ASC' } },
    },
  ]);
  assert.deepEqual(result, {
    balance: 100,
    products: [
      {
        id: 'product-1',
        name: 'Brownie',
        imageUrl: 'https://example.com/brownie.png',
        price: '12.50',
        redemptionCost: 80,
      },
      {
        id: 'product-2',
        name: 'Cafe',
        imageUrl: null,
        price: '8.00',
        redemptionCost: 0,
      },
    ],
  });
});

test('returns null without querying products when the active customer is missing', async (): Promise<void> => {
  const em = new FakeEntityManager(null, []);
  const repository = new MikroOrmCustomerRedeemableProductsReadRepository(em as unknown as EntityManager);

  const result = await repository.getByCustomerId('missing-customer');

  assert.equal(result, null);
  assert.deepEqual(em.findCalls, []);
});

type CustomerFindWhere = {
  readonly id: string;
  readonly isActive: true;
};

type ProductFindWhere = {
  readonly isActive: true;
  readonly isRedeemable: true;
};

type ProductFindOptions = {
  readonly orderBy: {
    readonly name: 'ASC';
  };
};

type FindOneCall = {
  readonly entity: typeof Customer;
  readonly where: CustomerFindWhere;
};

type FindCall = {
  readonly entity: typeof Product;
  readonly options: ProductFindOptions;
  readonly where: ProductFindWhere;
};

type ProductData = {
  readonly id: string;
  readonly imageUrl: string | undefined;
  readonly name: string;
  readonly price: string;
  readonly redemptionCost: number | undefined;
};

class FakeEntityManager {
  public readonly findCalls: FindCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];

  public constructor(
    private readonly customer: Customer | null,
    private readonly products: Product[],
  ) {}

  public async findOne(entity: typeof Customer, where: CustomerFindWhere): Promise<Customer | null> {
    this.findOneCalls.push({ entity, where });

    return this.customer;
  }

  public async find(
    entity: typeof Product,
    where: ProductFindWhere,
    options: ProductFindOptions,
  ): Promise<Product[]> {
    this.findCalls.push({ entity, where, options });

    return this.products;
  }
}

function createCustomer(id: string, loyaltyPoints: number): Customer {
  const customer = new Customer();
  customer.id = id;
  customer.name = 'Yan';
  customer.phone = '81999990000';
  customer.loyaltyPoints = loyaltyPoints;

  return customer;
}

function createProduct(data: ProductData): Product {
  const product = new Product();
  product.id = data.id;
  product.name = data.name;
  product.price = data.price;

  if (data.imageUrl !== undefined) {
    product.imageUrl = data.imageUrl;
  }

  if (data.redemptionCost !== undefined) {
    product.redemptionCost = data.redemptionCost;
  }

  return product;
}
