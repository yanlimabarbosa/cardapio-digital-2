import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import config from '../config/mikro-orm.config';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { AdminUser } from '../entities/admin-user.entity';

interface ProductData {
  name: string;
  description?: string;
  price: string;
}

interface CategoryData {
  name: string;
  description?: string;
  sortOrder: number;
  products: ProductData[];
}

const menu: CategoryData[] = [
  {
    name: 'Lanches',
    description: 'Lanches tradicionais e especiais',
    sortOrder: 1,
    products: [
      { name: 'Misto', price: '13.99' },
      { name: 'Misto com Queijo do Reino', price: '16.99' },
      { name: 'Hambúrguer', price: '7.99' },
      { name: 'X Burguer', price: '11.99' },
      { name: 'X Egg', price: '13.99' },
      { name: 'X Egg Bacon', price: '16.00' },
      { name: 'X Bacon', price: '14.00' },
      { name: 'X Calabresa', price: '14.00' },
      { name: 'X Frango', price: '15.99' },
      { name: 'X Frango Egg', price: '17.99' },
      { name: 'X Frango Bacon', price: '17.99' },
      { name: 'X Frango Egg Bacon', price: '20.00' },
      { name: 'Americano', price: '14.99' },
      { name: 'Bauru', price: '12.99' },
      { name: 'Pão na Chapa', price: '5.99' },
      { name: 'Pão com Ovo', price: '6.99' },
      { name: 'Pão com Queijo', price: '10.99' },
      { name: 'Pão com Queijo e Ovo', price: '12.99' },
      { name: 'Pão com Queijo do Reino', price: '16.99' },
      { name: 'Pão com Queijo do Reino e Ovo', price: '17.99' },
      { name: 'Pão com Calabresa e Ovo', price: '13.99' },
      { name: 'Pão com Ovo e Salada', price: '8.99' },
      { name: 'Pão com Ovo e Bacon', price: '13.99' },
      { name: 'Pão com Ovo Queijo e Salada', price: '12.99' },
      { name: 'X Tudo', price: '23.99' },
    ],
  },
  {
    name: 'Porções',
    description: 'Porções individuais e para compartilhar',
    sortOrder: 2,
    products: [
      { name: 'Carne de Sol Desfiada', price: '8.50' },
      { name: 'Carne de Sol em Cubos', price: '14.00' },
      { name: 'Carne de Charque', price: '14.00' },
      { name: 'Frango Desfiado', price: '7.00' },
      { name: 'Calabresa', price: '6.00' },
      { name: 'Bacon', price: '6.00' },
      { name: 'Costela', price: '12.99' },
      { name: 'Galinha', price: '12.99' },
      { name: 'Rabada', price: '15.00' },
      { name: 'Bode', price: '15.00' },
      { name: 'Queijo Coalho', price: '5.00' },
      { name: 'Queijo de Manteiga', price: '7.00' },
      { name: 'Queijo do Reino', price: '9.00' },
      { name: 'Ovo Frito', price: '2.00' },
      { name: 'Batatinha Frita', price: '15.00' },
      { name: 'Isca de Carne de Sol', price: '14.00' },
      { name: 'Contra Filé', price: '16.00' },
      { name: 'Filé de Frango', price: '15.00' },
      { name: 'Bisteca Suína', price: '15.00' },
      { name: 'Arroz', price: '5.00' },
      { name: 'Feijão', price: '7.00' },
    ],
  },
  {
    name: 'Sopas',
    description: 'Sopas caseiras e quentinhas',
    sortOrder: 3,
    products: [
      { name: 'Sopa de Carne', price: '15.00' },
      { name: 'Sopa de Feijão', price: '15.00' },
      { name: 'Sopa de Frango', price: '15.00' },
      { name: 'Sopa de Costela', price: '15.00' },
    ],
  },
  {
    name: 'Executivos',
    description: 'Acompanha arroz, feijão, batata frita, salada e farofa',
    sortOrder: 4,
    products: [
      { name: 'Contra Filé', description: 'Acompanha arroz, feijão, batata frita, salada e farofa', price: '27.00' },
      { name: 'Filé de Frango', description: 'Acompanha arroz, feijão, batata frita, salada e farofa', price: '27.00' },
      { name: 'Bisteca Suína', description: 'Acompanha arroz, feijão, batata frita, salada e farofa', price: '27.00' },
      { name: 'Isca de Carne de Sol', description: 'Acompanha arroz, feijão, batata frita, salada e farofa', price: '27.00' },
      { name: 'Bode Cozido', description: 'Acompanha arroz, feijão, batata frita, salada e farofa', price: '27.00' },
      { name: 'Costela de Boi Cozida', description: 'Acompanha arroz, feijão, batata frita, salada e farofa', price: '27.00' },
      { name: 'Rabada Cozida', description: 'Acompanha arroz, feijão, batata frita, salada e farofa', price: '27.00' },
      { name: 'Galinha Cozida', description: 'Acompanha arroz, feijão, batata frita, salada e farofa', price: '27.00' },
    ],
  },
  {
    name: 'Macaxeira',
    description: 'Macaxeira cozida com acompanhamentos',
    sortOrder: 5,
    products: [
      { name: 'Macaxeira', price: '10.00' },
      { name: 'Macaxeira com Galinha Guisada', price: '20.00' },
      { name: 'Macaxeira com Calabresa', price: '20.00' },
      { name: 'Macaxeira com Costela', price: '21.99' },
      { name: 'Macaxeira com Bode', price: '22.99' },
      { name: 'Macaxeira com Rabada', price: '22.99' },
      { name: 'Macaxeira com Carne de Sol', price: '20.99' },
      { name: 'Macaxeira com Carne de Charque', price: '20.99' },
    ],
  },
  {
    name: 'Cuscuz',
    description: 'Cuscuz nordestino com acompanhamentos',
    sortOrder: 6,
    products: [
      { name: 'Cuscuz', price: '10.00' },
      { name: 'Cuscuz com Galinha', price: '20.00' },
      { name: 'Cuscuz com Calabresa', price: '20.00' },
      { name: 'Cuscuz com Costela', price: '21.99' },
      { name: 'Cuscuz com Bode', price: '22.99' },
      { name: 'Cuscuz com Rabada', price: '22.99' },
      { name: 'Cuscuz com Carne de Sol', price: '20.99' },
      { name: 'Cuscuz com Carne de Charque', price: '20.99' },
    ],
  },
  {
    name: 'Tapiocas',
    description: 'Tapiocas artesanais do Nordeste',
    sortOrder: 7,
    products: [
      // Básicas
      { name: 'Goma', price: '3.99' },
      { name: 'Coco', price: '7.99' },
      { name: 'Coco e Queijo', price: '13.99' },
      { name: 'Queijo Coalho ou Mussarela', price: '10.99' },
      { name: 'Queijo do Reino', price: '18.99' },
      { name: 'Queijo de Manteiga', price: '12.99' },
      { name: 'Queijo com Ovo', price: '13.99' },
      // Carne de Sol
      { name: 'Carne de Sol', price: '13.99' },
      { name: 'Carne de Sol com Queijo', price: '17.99' },
      { name: 'Carne de Sol com Catupiry', price: '15.99' },
      { name: 'Carne de Sol com Ovo', price: '15.99' },
      { name: 'Carne de Sol com Queijo de Manteiga', price: '18.99' },
      { name: 'Carne de Sol, Calabresa e Queijo', price: '19.99' },
      // Frango
      { name: 'Frango', price: '12.99' },
      { name: 'Frango com Ovo', price: '14.99' },
      { name: 'Frango com Queijo', price: '15.99' },
      { name: 'Frango com Catupiry', price: '14.99' },
      { name: 'Frango com Queijo de Manteiga', price: '17.99' },
      // Calabresa
      { name: 'Calabresa', description: 'Tapioca de calabresa', price: '9.99' },
      { name: 'Calabresa com Ovo', price: '12.99' },
      { name: 'Calabresa com Queijo', price: '15.99' },
      { name: 'Calabresa, Queijo e Ovo', price: '17.99' },
      { name: 'Calabresa com Queijo de Manteiga', price: '17.99' },
      // Ovo
      { name: 'Ovo', description: 'Tapioca de ovo', price: '6.99' },
      { name: 'Ovo com Bacon', price: '12.99' },
      { name: 'Ovo, Bacon e Catupiry', price: '15.99' },
      { name: 'Ovo, Queijo e Presunto', price: '17.99' },
      // Especiais
      { name: 'Mista', price: '15.99' },
      { name: 'Moda Saradão', description: 'Frango, coco, banana e queijo', price: '19.99' },
      { name: 'Moda Elite', description: 'Frango, carne, queijo, bacon e ovo', price: '26.99' },
      { name: 'Omelete', price: '19.99' },
      { name: 'Banana', price: '5.99' },
    ],
  },
  {
    name: 'Tapiocas Doces',
    description: 'Tapiocas doces e sobremesas',
    sortOrder: 8,
    products: [
      { name: 'Cartola', price: '13.99' },
      { name: 'Chocolate', price: '9.99' },
      { name: 'Queijo com Goiabada', price: '13.99' },
      { name: 'Coco com Chocolate', price: '11.99' },
      { name: 'Coco com Leite Condensado', price: '10.99' },
      { name: 'Coco, Queijo e Leite Condensado', price: '16.99' },
      { name: 'Banana e Chocolate', price: '10.99' },
      { name: 'Queijo e Chocolate', price: '13.99' },
      { name: 'Queijo e Leite Condensado', price: '13.99' },
      { name: 'Goiabada', price: '6.99' },
      { name: 'Leite Condensado', price: '6.99' },
    ],
  },
  {
    name: 'Bebidas',
    description: 'Cafés e águas',
    sortOrder: 9,
    products: [
      { name: 'Água Mineral', price: '3.00' },
      { name: 'Água Mineral com Gás', price: '4.00' },
      { name: 'Café P', price: '3.00' },
      { name: 'Café G', price: '4.00' },
      { name: 'Café com Leite P', price: '3.00' },
      { name: 'Café com Leite G', price: '5.00' },
      { name: 'Café de 300ml', price: '6.00' },
      { name: 'Café com Leite 300ml', price: '6.99' },
      { name: 'Café Expresso P', price: '5.00' },
      { name: 'Café Expresso G', price: '10.00' },
    ],
  },
  {
    name: 'Sucos',
    description: 'Sabores: Abacaxi, Acerola, Açaí, Cajá, Caju, Manga, Mangaba, Maracujá, Morango, Goiaba, Graviola, Uva',
    sortOrder: 10,
    products: [
      { name: 'Copo de Laranja', price: '7.00' },
      { name: 'Jarra de Laranja', price: '16.00' },
      { name: 'Sucos de Polpa na Água', description: 'Escolha o sabor', price: '6.00' },
      { name: 'Sucos no Leite', description: 'Escolha o sabor', price: '8.00' },
      { name: 'Jarra na Água', description: 'Escolha o sabor', price: '16.00' },
      { name: 'Jarra no Leite', description: 'Escolha o sabor', price: '22.00' },
      { name: 'Banana Simples', price: '7.00' },
      { name: 'Açaí com Banana e Leite', price: '10.00' },
      { name: 'Cupuaçu na Água', price: '8.00' },
      { name: 'Cupuaçu no Leite', price: '9.00' },
    ],
  },
  {
    name: 'Refrigerantes',
    description: 'Refrigerantes em lata',
    sortOrder: 11,
    products: [
      { name: 'Coca Cola Lata', price: '7.00' },
      { name: 'Coca Cola Zero Lata', price: '7.00' },
      { name: 'Guaraná Antártica Lata', price: '7.00' },
      { name: 'Guaraná Antártica Zero', price: '7.00' },
      { name: 'Fanta Laranja Lata', price: '7.00' },
      { name: 'Fanta Uva', price: '7.00' },
      { name: 'Sprite', price: '7.00' },
      { name: 'H2OH!', price: '7.00' },
      { name: 'H2OH! Limoneto', price: '7.00' },
      { name: 'Schweppes Cítrus Lata', price: '7.00' },
      { name: 'Schweppes Tônica', price: '7.00' },
      { name: 'Ice Tea Leão', price: '5.00' },
      { name: 'Toddynho', price: '3.00' },
    ],
  },
  {
    name: 'Cervejas',
    description: 'Cervejas geladas',
    sortOrder: 12,
    products: [
      { name: 'Long Neck', price: '10.00' },
    ],
  },
];

async function seed() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  // Clear existing data
  await em.execute('DELETE FROM product_extras');
  await em.execute('DELETE FROM order_items');
  await em.execute('DELETE FROM orders');
  await em.execute('DELETE FROM products');
  await em.execute('DELETE FROM categories');

  // Create categories and products
  let totalProducts = 0;
  for (const cat of menu) {
    const category = em.create(Category, {
      name: cat.name,
      description: cat.description,
      sortOrder: cat.sortOrder,
    });

    for (const prod of cat.products) {
      em.create(Product, {
        category,
        name: prod.name,
        description: prod.description,
        price: prod.price,
      });
      totalProducts++;
    }
  }

  await em.flush();

  // Admin user
  await em.execute('DELETE FROM admin_users');
  const passwordHash = await bcrypt.hash('admin123', 10);
  em.create(AdminUser, {
    email: 'admin@bemcomer.com',
    passwordHash,
    name: 'Admin',
  });
  await em.flush();

  const categoryCount = await em.count(Category);
  const productCount = await em.count(Product);

  console.log(`Seed complete: ${categoryCount} categories, ${totalProducts} products`);
  console.log('Admin user: admin@bemcomer.com / admin123');

  await orm.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
