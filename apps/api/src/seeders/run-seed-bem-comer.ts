import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/postgresql';
import type { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import config from '../config/mikro-orm.config';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { OptionGroup } from '../entities/option-group.entity';
import { ProductExtra } from '../entities/product-extra.entity';
import { AdminUser } from '../entities/admin-user.entity';
import { StoreSettings } from '../entities/store-settings.entity';
import type { WeeklySchedule } from '@cardapio/shared';

interface GroupSpec {
  name: string;
  min: number;
  max: number;
  options: string[];
}

interface ProductSpec {
  categoryName: string;
  name: string;
  description?: string;
  price: string;
  sortOrder: number;
  groups: GroupSpec[];
}

const LUNCH_EVERY_DAY: WeeklySchedule = {
  0: [{ start: '11:00', end: '15:00' }],
  1: [{ start: '11:00', end: '15:00' }],
  2: [{ start: '11:00', end: '15:00' }],
  3: [{ start: '11:00', end: '15:00' }],
  4: [{ start: '11:00', end: '15:00' }],
  5: [{ start: '11:00', end: '15:00' }],
  6: [{ start: '11:00', end: '15:00' }],
};

const DINNER_MON_SAT: WeeklySchedule = {
  0: [],
  1: [{ start: '18:00', end: '21:00' }],
  2: [{ start: '18:00', end: '21:00' }],
  3: [{ start: '18:00', end: '21:00' }],
  4: [{ start: '18:00', end: '21:00' }],
  5: [{ start: '18:00', end: '21:00' }],
  6: [{ start: '18:00', end: '21:00' }],
};

const STORE_WEEKLY_SCHEDULE: WeeklySchedule = {
  0: [{ start: '11:00', end: '21:00' }],
  1: [{ start: '11:00', end: '21:00' }],
  2: [{ start: '11:00', end: '21:00' }],
  3: [{ start: '11:00', end: '21:00' }],
  4: [{ start: '11:00', end: '21:00' }],
  5: [{ start: '11:00', end: '21:00' }],
  6: [{ start: '11:00', end: '21:00' }],
};

const ARROZ = ['Arroz branco', 'Arroz refogado'];
const FEIJAO = ['Feijão preto', 'Feijão carioca', 'Feijão Macassar na farofa'];
const ACOMP_ALMOCO = [
  'Macarrão',
  'Purê de macaxeira',
  'Farofa de cuscuz',
  'Pirão de carne',
  'Rubacão',
  'Farofa',
];
const PROT_ALMOCO = [
  'Frango guisado',
  'Carne guisada',
  'Fígado acebolado',
  'Filé de frango empanado',
  'Posta de atum frita',
];
const SALADA = [
  'Alface',
  'Tomate',
  'Pepino',
  'Repolho e cenoura na maionese',
  'Verduras na maionese',
  'Vinagrete',
  'Beterraba',
  'Couve',
  'Abacaxi',
  'Repolho refogado',
];
const CHURRASCO = [
  'Maminha',
  'Fraldinha',
  'Alcatra',
  'Cupim',
  'Coxa e sobrecoxa de frango',
  'Linguiça mista',
  'Linguiça de frango',
  'Pernil suíno',
];
const BASE_JANTAR = [
  'Arroz branco',
  'Arroz de leite',
  'Macarrão',
  'Cuscuz',
  'Macaxeira',
  'Inhame',
];
const PROT_JANTAR = [
  'Carne de sol acebolada',
  'Frango guisado',
  'Carne guisada',
  'Mistão churrasco',
];
const SABOR_SOPA = ['Sopa de feijão', 'Sopa de carne'];

const products: ProductSpec[] = [
  // ===== ALMOÇO =====
  {
    categoryName: 'Almoço',
    name: 'Quentinha P — Almoço',
    description: 'Marmita pequena 500ml — monte sua refeição',
    price: '17.00',
    sortOrder: 1,
    groups: [
      { name: 'Arroz', min: 1, max: 1, options: ARROZ },
      { name: 'Feijão', min: 0, max: 1, options: FEIJAO },
      { name: 'Acompanhamentos', min: 0, max: 1, options: ACOMP_ALMOCO },
      { name: 'Proteína', min: 1, max: 1, options: PROT_ALMOCO },
      { name: 'Salada', min: 0, max: 2, options: SALADA },
    ],
  },
  {
    categoryName: 'Almoço',
    name: 'Quentinha M — Almoço',
    description: 'Marmita média 700ml — mais espaço para você caprichar',
    price: '22.00',
    sortOrder: 2,
    groups: [
      { name: 'Arroz', min: 1, max: 1, options: ARROZ },
      { name: 'Feijão', min: 0, max: 1, options: FEIJAO },
      { name: 'Acompanhamentos', min: 0, max: 2, options: ACOMP_ALMOCO },
      { name: 'Proteína', min: 1, max: 2, options: PROT_ALMOCO },
      { name: 'Salada', min: 0, max: 3, options: SALADA },
      { name: 'Churrasco', min: 0, max: 1, options: CHURRASCO },
    ],
  },
  {
    categoryName: 'Almoço',
    name: 'Quentinha G — Almoço',
    description: 'Marmita grande 900ml — para matar a fome com sobra',
    price: '28.00',
    sortOrder: 3,
    groups: [
      { name: 'Arroz', min: 1, max: 1, options: ARROZ },
      { name: 'Feijão', min: 0, max: 1, options: FEIJAO },
      { name: 'Acompanhamentos', min: 0, max: 3, options: ACOMP_ALMOCO },
      { name: 'Proteína', min: 1, max: 3, options: PROT_ALMOCO },
      { name: 'Salada', min: 0, max: 4, options: SALADA },
      { name: 'Churrasco', min: 0, max: 2, options: CHURRASCO },
    ],
  },
  // ===== JANTAR =====
  {
    categoryName: 'Jantar',
    name: 'Quentinha P — Jantar',
    description: 'Marmita pequena 500ml — cardápio da noite',
    price: '17.00',
    sortOrder: 1,
    groups: [
      { name: 'Base', min: 1, max: 1, options: BASE_JANTAR },
      { name: 'Proteína', min: 1, max: 1, options: PROT_JANTAR },
    ],
  },
  {
    categoryName: 'Jantar',
    name: 'Quentinha M — Jantar',
    description: 'Marmita média 700ml — cardápio da noite',
    price: '22.00',
    sortOrder: 2,
    groups: [
      { name: 'Base', min: 1, max: 2, options: BASE_JANTAR },
      { name: 'Proteína', min: 1, max: 2, options: PROT_JANTAR },
      { name: 'Sopa adicional', min: 0, max: 1, options: SABOR_SOPA },
    ],
  },
  {
    categoryName: 'Jantar',
    name: 'Quentinha G — Jantar',
    description: 'Marmita grande 900ml — cardápio da noite',
    price: '28.00',
    sortOrder: 3,
    groups: [
      { name: 'Base', min: 1, max: 3, options: BASE_JANTAR },
      { name: 'Proteína', min: 1, max: 3, options: PROT_JANTAR },
      { name: 'Sopa adicional', min: 0, max: 1, options: SABOR_SOPA },
    ],
  },
  // ===== SOPAS =====
  {
    categoryName: 'Sopas',
    name: 'Sopa P',
    description: 'Porção pequena — escolha o sabor',
    price: '12.00',
    sortOrder: 1,
    groups: [{ name: 'Sabor', min: 1, max: 1, options: SABOR_SOPA }],
  },
  {
    categoryName: 'Sopas',
    name: 'Sopa M',
    description: 'Porção média — escolha o sabor',
    price: '18.00',
    sortOrder: 2,
    groups: [{ name: 'Sabor', min: 1, max: 1, options: SABOR_SOPA }],
  },
  {
    categoryName: 'Sopas',
    name: 'Sopa G',
    description: 'Porção grande — escolha o sabor',
    price: '22.00',
    sortOrder: 3,
    groups: [{ name: 'Sabor', min: 1, max: 1, options: SABOR_SOPA }],
  },
];

function createCompoundProduct(
  em: EntityManager,
  category: Category,
  spec: ProductSpec,
) {
  const product = em.create(Product, {
    category,
    name: spec.name,
    description: spec.description,
    price: spec.price,
    sortOrder: spec.sortOrder,
    isCompound: true,
  });

  spec.groups.forEach((group, gi) => {
    const optionGroup = em.create(OptionGroup, {
      product,
      name: group.name,
      minSelections: group.min,
      maxSelections: group.max,
      sortOrder: gi,
      isActive: true,
    });

    group.options.forEach((optionName, oi) => {
      em.create(ProductExtra, {
        product,
        optionGroup,
        name: optionName,
        price: '0',
        sortOrder: oi,
        isActive: true,
      });
    });
  });
}

async function seed() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  // Clear existing menu data in FK-safe order
  await em.execute('DELETE FROM product_extras');
  await em.execute('DELETE FROM option_groups');
  await em.execute('DELETE FROM section_products');
  await em.execute('DELETE FROM order_items');
  await em.execute('DELETE FROM coupon_usages');
  await em.execute('DELETE FROM orders');
  await em.execute('DELETE FROM products');
  await em.execute('DELETE FROM categories');

  // Categories
  const categorySpecs: Array<{ name: string; description: string; sortOrder: number; availabilitySchedule?: WeeklySchedule }> = [
    { name: 'Almoço', description: 'Cardápio do almoço — todos os dias, 11h às 15h', sortOrder: 1, availabilitySchedule: LUNCH_EVERY_DAY },
    { name: 'Jantar', description: 'Cardápio do jantar — segunda a sábado, 18h às 21h', sortOrder: 2, availabilitySchedule: DINNER_MON_SAT },
    { name: 'Sopas', description: 'Sopas do dia', sortOrder: 3 },
    { name: 'Porções', description: 'Para acompanhar', sortOrder: 4 },
    { name: 'Bebidas', description: 'Refrigerantes e águas', sortOrder: 5 },
    { name: 'Sobremesas', description: 'Cocadas, pudim e docinhos', sortOrder: 6 },
  ];
  const categoryMap = new Map<string, Category>();
  for (const spec of categorySpecs) {
    const cat = em.create(Category, { ...spec, isActive: true });
    categoryMap.set(spec.name, cat);
  }

  // Compound products
  for (const spec of products) {
    const category = categoryMap.get(spec.categoryName);
    if (!category) throw new Error(`Missing category ${spec.categoryName}`);
    createCompoundProduct(em, category, spec);
  }

  // Simple (non-compound) products
  const simpleProducts: Array<{
    categoryName: string;
    name: string;
    description?: string;
    price: string;
    sortOrder: number;
    isActive?: boolean;
  }> = [
    // Porções
    { categoryName: 'Porções', name: 'Batata frita P', price: '7.00', sortOrder: 1 },
    { categoryName: 'Porções', name: 'Batata frita G', price: '15.00', sortOrder: 2 },
    // Bebidas
    { categoryName: 'Bebidas', name: 'Água Mineral', price: '3.00', sortOrder: 1 },
    { categoryName: 'Bebidas', name: 'Água com gás', price: '4.00', sortOrder: 2 },
    { categoryName: 'Bebidas', name: 'Coca Cola Lata', price: '6.00', sortOrder: 3 },
    { categoryName: 'Bebidas', name: 'Coca Zero Lata', price: '6.00', sortOrder: 4 },
    { categoryName: 'Bebidas', name: 'Guaraná Lata', price: '6.00', sortOrder: 5 },
    { categoryName: 'Bebidas', name: 'Guaraná Zero Lata', price: '6.00', sortOrder: 6 },
    { categoryName: 'Bebidas', name: 'Fanta Lata', price: '6.00', sortOrder: 7 },
    { categoryName: 'Bebidas', name: 'H2O Limoneto', price: '7.00', sortOrder: 8 },
    { categoryName: 'Bebidas', name: 'Coca Cola 1L', price: '12.00', sortOrder: 9 },
    { categoryName: 'Bebidas', name: 'Coca Cola Zero 1L', price: '12.00', sortOrder: 10 },
    { categoryName: 'Bebidas', name: 'Guaraná 1L', price: '10.00', sortOrder: 11 },
    // Sobremesas
    { categoryName: 'Sobremesas', name: 'Pudim', price: '8.00', sortOrder: 1 },
    { categoryName: 'Sobremesas', name: 'Cocada Branca', price: '6.00', sortOrder: 2 },
    { categoryName: 'Sobremesas', name: 'Cocada Preta', price: '6.00', sortOrder: 3 },
    { categoryName: 'Sobremesas', name: 'Cocada de Maracujá', price: '6.00', sortOrder: 4 },
    { categoryName: 'Sobremesas', name: 'Cocada de Doce de Leite', price: '3.00', sortOrder: 5 },
    { categoryName: 'Sobremesas', name: 'Doce de Leite Caseiro Cremoso', price: '0.00', sortOrder: 6, isActive: false },
    { categoryName: 'Sobremesas', name: 'Doce de Leite Cremoso com Goiaba', price: '0.00', sortOrder: 7, isActive: false },
    { categoryName: 'Sobremesas', name: 'Paçoca', price: '0.00', sortOrder: 8, isActive: false },
    {
      categoryName: 'Sobremesas',
      name: 'Trufa',
      description: 'Sabores: Beijinho, Brigadeiro, Brigadeiro Branco, Dois Amores — informar no pedido',
      price: '0.00',
      sortOrder: 9,
      isActive: false,
    },
  ];

  for (const p of simpleProducts) {
    const category = categoryMap.get(p.categoryName);
    if (!category) throw new Error(`Missing category ${p.categoryName}`);
    em.create(Product, {
      category,
      name: p.name,
      description: p.description,
      price: p.price,
      sortOrder: p.sortOrder,
      isActive: p.isActive ?? true,
      isCompound: false,
    });
  }

  await em.flush();

  let settings = await em.findOne(StoreSettings, { id: 1 });
  if (!settings) {
    settings = em.create(StoreSettings, {
      id: 1,
      openingTime: '11:00',
      closingTime: '21:00',
      openDays: [0, 1, 2, 3, 4, 5, 6],
      forceClose: false,
      forceOpen: false,
      weeklySchedule: STORE_WEEKLY_SCHEDULE,
    });
  } else {
    settings.openingTime = '11:00';
    settings.closingTime = '21:00';
    settings.openDays = [0, 1, 2, 3, 4, 5, 6];
    settings.weeklySchedule = STORE_WEEKLY_SCHEDULE;
  }

  // Admin user
  await em.execute('DELETE FROM admin_users');
  const passwordHash = await bcrypt.hash('BemComer@2026#Painel47', 10);
  em.create(AdminUser, {
    email: 'admin@bemcomer.com',
    passwordHash,
    name: 'Admin',
  });
  await em.flush();

  const categoryCount = await em.count(Category);
  const productCount = await em.count(Product);
  const groupCount = await em.count(OptionGroup);
  const optionCount = await em.count(ProductExtra);

  console.log(
    `Seed complete: ${categoryCount} categorias, ${productCount} produtos, ${groupCount} grupos, ${optionCount} opções`,
  );
  console.log('Admin: admin@bemcomer.com / BemComer@2026#Painel47');

  await orm.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
