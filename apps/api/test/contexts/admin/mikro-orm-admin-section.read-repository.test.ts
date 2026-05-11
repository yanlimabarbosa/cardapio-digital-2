import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { WeeklySchedule } from '@cardapio/shared';
import { MikroOrmAdminSectionReadRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-section.read-repository';
import { Product, Section, SectionProduct } from '../../../src/entities';

test('maps admin sections without leaking ORM collections', async (): Promise<void> => {
  const availabilitySchedule: WeeklySchedule = {
    1: [{ start: '11:00', end: '15:00' }],
  };
  const section = createSection({ availabilitySchedule });
  const em = new FakeEntityManager([section]);
  const repository = new MikroOrmAdminSectionReadRepository(em as unknown as EntityManager);

  const result = await repository.list();

  assert.deepEqual(em.findCalls, [
    {
      entity: Section,
      where: {},
      options: { populate: ['products.product'], orderBy: { sortOrder: 'ASC' } },
    },
  ]);
  assert.deepEqual(result, [
    {
      id: 'section-1',
      label: 'Lunch',
      emoji: ':)',
      sortOrder: 0,
      isActive: true,
      availabilitySchedule,
      productCount: 2,
      products: [
        {
          id: 'product-2',
          name: 'Bebida',
          price: 6,
          imageUrl: undefined,
        },
        {
          id: 'product-1',
          name: 'Quentinha',
          price: 17.5,
          imageUrl: '/uploads/quentinha.webp',
        },
      ],
    },
  ]);
});

type CreateSectionOptions = {
  readonly availabilitySchedule: WeeklySchedule | null;
};

function createSection(options: CreateSectionOptions): Section {
  const section = new Section();
  section.id = 'section-1';
  section.label = 'Lunch';
  section.emoji = ':)';
  section.sortOrder = undefined;
  section.isActive = undefined;
  section.availabilitySchedule = options.availabilitySchedule;

  const firstProduct = createProduct({
    id: 'product-1',
    name: 'Quentinha',
    price: '17.50',
    imageUrl: '/uploads/quentinha.webp',
  });
  const secondProduct = createProduct({
    id: 'product-2',
    name: 'Bebida',
    price: '6.00',
    imageUrl: undefined,
  });
  const firstSectionProduct = createSectionProduct({
    product: firstProduct,
    section,
    sortOrder: 2,
  });
  const secondSectionProduct = createSectionProduct({
    product: secondProduct,
    section,
    sortOrder: 1,
  });
  section.products = createCollection([
    firstSectionProduct,
    secondSectionProduct,
  ]) as unknown as Section['products'];

  return section;
}

type CreateProductOptions = {
  readonly id: string;
  readonly imageUrl?: string;
  readonly name: string;
  readonly price: string;
};

function createProduct(options: CreateProductOptions): Product {
  const product = new Product();
  product.id = options.id;
  product.name = options.name;
  product.price = options.price;
  product.imageUrl = options.imageUrl;

  return product;
}

type CreateSectionProductOptions = {
  readonly product: Product;
  readonly section: Section;
  readonly sortOrder: number;
};

function createSectionProduct(options: CreateSectionProductOptions): SectionProduct {
  const sectionProduct = new SectionProduct();
  sectionProduct.product = options.product;
  sectionProduct.section = options.section;
  sectionProduct.sortOrder = options.sortOrder;

  return sectionProduct;
}

function createCollection<T>(items: readonly T[]): FakeCollection<T> {
  return new FakeCollection(items);
}

class FakeCollection<T> {
  public constructor(private readonly items: readonly T[]) {}

  public get length(): number {
    return this.items.length;
  }

  public getItems(): T[] {
    return [...this.items];
  }
}

type FindCall = {
  readonly entity: typeof Section;
  readonly options: unknown;
  readonly where: Record<string, unknown>;
};

class FakeEntityManager {
  public readonly findCalls: FindCall[] = [];

  public constructor(private readonly sections: readonly Section[]) {}

  public async find(
    entity: typeof Section,
    where: Record<string, unknown>,
    options: unknown,
  ): Promise<readonly Section[]> {
    this.findCalls.push({ entity, where, options });
    return this.sections;
  }
}
