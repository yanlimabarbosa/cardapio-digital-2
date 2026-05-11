import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { WeeklySchedule } from '@cardapio/shared';
import { MikroOrmAdminSectionWriteRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-section-write.repository';
import { Product, Section, SectionProduct } from '../../../src/entities';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('creates an admin section through the provided transaction context', async (): Promise<void> => {
  const em = new FakeEntityManager(3);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.create(
    {
      label: 'Dinner',
      emoji: ':D',
      availabilitySchedule: {
        2: [
          { start: '18:00', end: '21:00' },
          { start: '09:00', end: '12:00' },
          { start: '20:00', end: '22:00' },
          { start: '22:00', end: '21:00' },
        ],
      },
    },
    context,
  );

  assert.deepEqual(em.countCalls, [{ entity: Section, where: {} }]);
  assert.equal(em.createCalls.length, 1);
  assert.deepEqual(em.createCalls[0], {
    entity: Section,
    data: {
      label: 'Dinner',
      emoji: ':D',
      sortOrder: 3,
      availabilitySchedule: {
        2: [
          { start: '09:00', end: '12:00' },
          { start: '18:00', end: '22:00' },
        ],
      },
    },
  });
  assert.deepEqual(result, {
    id: 'created-section-1',
    label: 'Dinner',
    emoji: ':D',
    sortOrder: 3,
    isActive: true,
    availabilitySchedule: {
      2: [
        { start: '09:00', end: '12:00' },
        { start: '18:00', end: '22:00' },
      ],
    },
    productCount: 0,
    products: [],
  });
  assert.equal(em.flushCalls, 1);
});

test('defaults missing admin section emoji and schedule like the legacy service', async (): Promise<void> => {
  const em = new FakeEntityManager(0);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.create({ label: 'Lunch' }, context);

  assert.deepEqual(em.createCalls[0], {
    entity: Section,
    data: {
      label: 'Lunch',
      emoji: '',
      sortOrder: 0,
      availabilitySchedule: null,
    },
  });
  assert.equal(result.emoji, '');
  assert.equal(result.availabilitySchedule, null);
  assert.equal(result.productCount, 0);
  assert.deepEqual(result.products, []);
});

test('deletes an admin section through the provided transaction context', async (): Promise<void> => {
  const section = createSection('section-1');
  const em = new FakeEntityManager(0, [section]);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.delete('section-1', context);

  assert.equal(result, true);
  assert.deepEqual(em.findOneCalls, [{ entity: Section, where: { id: 'section-1' } }]);
  assert.deepEqual(em.removeAndFlushCalls, [section]);
  assert.equal(em.flushCalls, 0);
});

test('returns false without removing when deleting a missing admin section', async (): Promise<void> => {
  const em = new FakeEntityManager(0, []);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.delete('missing-section', context);

  assert.equal(result, false);
  assert.deepEqual(em.findOneCalls, [{ entity: Section, where: { id: 'missing-section' } }]);
  assert.deepEqual(em.removeAndFlushCalls, []);
});

test('reorders admin sections through the provided transaction context', async (): Promise<void> => {
  const firstSection = createSection('section-1');
  const secondSection = createSection('section-2');
  const em = new FakeEntityManager(0, [firstSection, secondSection]);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  await repository.reorder(
    [
      { id: 'section-2', sortOrder: 0 },
      { id: 'missing-section', sortOrder: 1 },
      { id: 'section-1', sortOrder: 2 },
    ],
    context,
  );

  assert.deepEqual(em.findOneCalls, [
    { entity: Section, where: { id: 'section-2' } },
    { entity: Section, where: { id: 'missing-section' } },
    { entity: Section, where: { id: 'section-1' } },
  ]);
  assert.equal(secondSection.sortOrder, 0);
  assert.equal(firstSection.sortOrder, 2);
  assert.equal(em.flushCalls, 1);
});

test('updates an admin section through the provided transaction context', async (): Promise<void> => {
  const section = createSection('section-1');
  section.emoji = ':)';
  section.sortOrder = 4;
  section.isActive = true;
  section.availabilitySchedule = null;
  const em = new FakeEntityManager(0, [section]);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update(
    'section-1',
    {
      label: 'Dinner',
      isActive: false,
      availabilitySchedule: {
        1: [
          { start: '18:00', end: '21:00' },
          { start: '09:00', end: '12:00' },
          { start: '20:00', end: '22:00' },
          { start: '22:00', end: '21:00' },
        ],
      },
    },
    context,
  );

  assert.deepEqual(em.findOneCalls, [{ entity: Section, where: { id: 'section-1' } }]);
  assert.equal(section.label, 'Dinner');
  assert.equal(section.emoji, ':)');
  assert.equal(section.isActive, false);
  assert.deepEqual(section.availabilitySchedule, {
    1: [
      { start: '09:00', end: '12:00' },
      { start: '18:00', end: '22:00' },
    ],
  });
  assert.deepEqual(result, {
    id: 'section-1',
    label: 'Dinner',
    emoji: ':)',
    sortOrder: 4,
    isActive: false,
    availabilitySchedule: {
      1: [
        { start: '09:00', end: '12:00' },
        { start: '18:00', end: '22:00' },
      ],
    },
  });
  assert.equal(em.flushCalls, 1);
});

test('returns null without flushing when updating a missing admin section', async (): Promise<void> => {
  const em = new FakeEntityManager(0, []);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update('missing-section', { label: 'Missing' }, context);

  assert.equal(result, null);
  assert.deepEqual(em.findOneCalls, [{ entity: Section, where: { id: 'missing-section' } }]);
  assert.equal(em.flushCalls, 0);
});

test('sets admin section products through the provided transaction context', async (): Promise<void> => {
  const section = createSection('section-1');
  const existingProduct = createProduct('existing-product');
  const existingLink = createSectionProduct('section-product-1', section, existingProduct);
  section.products.getItems = (): SectionProduct[] => [existingLink];
  const firstProduct = createProduct('product-2');
  const secondProduct = createProduct('product-1');
  const em = new FakeEntityManager(0, [section], [firstProduct, secondProduct]);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.setProducts('section-1', ['product-2', 'product-1'], context);
  const sectionProductCreateCalls = em.createCalls.filter(isSectionProductCreateCall);

  assert.deepEqual(result, { status: 'success' });
  assert.deepEqual(em.findOneCalls, [
    { entity: Section, where: { id: 'section-1' }, options: { populate: ['products'] } },
    { entity: Product, where: { id: 'product-2' } },
    { entity: Product, where: { id: 'product-1' } },
  ]);
  assert.deepEqual(em.removeCalls, [existingLink]);
  assert.deepEqual(sectionProductCreateCalls, [
    {
      entity: SectionProduct,
      data: {
        section,
        product: firstProduct,
        sortOrder: 0,
      },
    },
    {
      entity: SectionProduct,
      data: {
        section,
        product: secondProduct,
        sortOrder: 1,
      },
    },
  ]);
  assert.equal(em.flushCalls, 1);
});

test('returns section-not-found without flushing when setting products for a missing admin section', async (): Promise<void> => {
  const em = new FakeEntityManager(0, []);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.setProducts('missing-section', ['product-1'], context);

  assert.deepEqual(result, { status: 'section-not-found' });
  assert.deepEqual(em.findOneCalls, [
    { entity: Section, where: { id: 'missing-section' }, options: { populate: ['products'] } },
  ]);
  assert.deepEqual(em.removeCalls, []);
  assert.equal(em.createCalls.length, 0);
  assert.equal(em.flushCalls, 0);
});

test('returns product-not-found before mutating section products', async (): Promise<void> => {
  const section = createSection('section-1');
  const existingProduct = createProduct('existing-product');
  const existingLink = createSectionProduct('section-product-1', section, existingProduct);
  section.products.getItems = (): SectionProduct[] => [existingLink];
  const em = new FakeEntityManager(0, [section], [createProduct('product-1')]);
  const repository = new MikroOrmAdminSectionWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.setProducts(
    'section-1',
    ['product-1', 'missing-product'],
    context,
  );

  assert.deepEqual(result, { status: 'product-not-found', productId: 'missing-product' });
  assert.deepEqual(em.findOneCalls, [
    { entity: Section, where: { id: 'section-1' }, options: { populate: ['products'] } },
    { entity: Product, where: { id: 'product-1' } },
    { entity: Product, where: { id: 'missing-product' } },
  ]);
  assert.deepEqual(em.removeCalls, []);
  assert.equal(em.createCalls.length, 0);
  assert.equal(em.flushCalls, 0);
});

type CountCall = {
  readonly entity: typeof Section;
  readonly where: Record<string, never>;
};

type SectionCreateData = {
  readonly availabilitySchedule: WeeklySchedule | null;
  readonly emoji: string;
  readonly label: string;
  readonly sortOrder: number;
};

type SectionProductCreateData = {
  readonly product: Product;
  readonly section: Section;
  readonly sortOrder: number;
};

type SectionCreateCall = {
  readonly data: SectionCreateData;
  readonly entity: typeof Section;
};

type SectionProductCreateCall = {
  readonly data: SectionProductCreateData;
  readonly entity: typeof SectionProduct;
};

type CreateCall = SectionCreateCall | SectionProductCreateCall;

type FindOneOptions = {
  readonly populate: readonly string[];
};

type FindOneCall = {
  readonly entity: typeof Product | typeof Section;
  readonly options?: FindOneOptions;
  readonly where: { readonly id: string };
};

class FakeEntityManager {
  public readonly countCalls: CountCall[] = [];
  public readonly createCalls: CreateCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];
  public readonly removeAndFlushCalls: Section[] = [];
  public readonly removeCalls: SectionProduct[] = [];
  public flushCalls = 0;

  public constructor(
    private readonly sectionCount: number,
    private readonly sections: readonly Section[] = [],
    private readonly products: readonly Product[] = [],
  ) {}

  public async count(entity: typeof Section, where: Record<string, never>): Promise<number> {
    this.countCalls.push({ entity, where });

    return this.sectionCount;
  }

  public create(entity: typeof Section, data: SectionCreateData): Section;
  public create(entity: typeof SectionProduct, data: SectionProductCreateData): SectionProduct;
  public create(
    entity: typeof Section | typeof SectionProduct,
    data: SectionCreateData | SectionProductCreateData,
  ): Section | SectionProduct {
    if (entity === SectionProduct && isSectionProductCreateData(data)) {
      this.createCalls.push({ entity, data });
      const sectionProduct = new SectionProduct();
      sectionProduct.id = `created-section-product-${this.createCalls.length}`;
      sectionProduct.section = data.section;
      sectionProduct.product = data.product;
      sectionProduct.sortOrder = data.sortOrder;

      return sectionProduct;
    }

    if (entity === Section && isSectionCreateData(data)) {
      this.createCalls.push({ entity, data });
      const section = new Section();
      section.id = `created-section-${this.createCalls.length}`;
      section.label = data.label;
      section.emoji = data.emoji;
      section.sortOrder = data.sortOrder;
      section.availabilitySchedule = data.availabilitySchedule;

      return section;
    }

    throw new Error('Unsupported create call');
  }

  public async findOne(
    entity: typeof Section,
    where: { readonly id: string },
    options?: FindOneOptions,
  ): Promise<Section | null>;
  public async findOne(
    entity: typeof Product,
    where: { readonly id: string },
    options?: FindOneOptions,
  ): Promise<Product | null>;
  public async findOne(
    entity: typeof Product | typeof Section,
    where: { readonly id: string },
    options?: FindOneOptions,
  ): Promise<Product | Section | null> {
    this.findOneCalls.push(options ? { entity, where, options } : { entity, where });

    if (entity === Product) {
      return this.products.find((product) => product.id === where.id) ?? null;
    }

    return this.sections.find((section) => section.id === where.id) ?? null;
  }

  public remove(sectionProduct: SectionProduct): void {
    this.removeCalls.push(sectionProduct);
  }

  public async removeAndFlush(section: Section): Promise<void> {
    this.removeAndFlushCalls.push(section);
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}

function createSection(id: string): Section {
  const section = new Section();
  section.id = id;
  section.label = `Section ${id}`;

  return section;
}

function createProduct(id: string): Product {
  const product = new Product();
  product.id = id;
  product.name = `Product ${id}`;
  product.price = '10.00';

  return product;
}

function createSectionProduct(id: string, section: Section, product: Product): SectionProduct {
  const sectionProduct = new SectionProduct();
  sectionProduct.id = id;
  sectionProduct.section = section;
  sectionProduct.product = product;
  sectionProduct.sortOrder = 0;

  return sectionProduct;
}

function isSectionCreateData(
  data: SectionCreateData | SectionProductCreateData,
): data is SectionCreateData {
  return 'label' in data;
}

function isSectionProductCreateData(
  data: SectionCreateData | SectionProductCreateData,
): data is SectionProductCreateData {
  return 'section' in data;
}

function isSectionProductCreateCall(call: CreateCall): call is SectionProductCreateCall {
  return call.entity === SectionProduct;
}
