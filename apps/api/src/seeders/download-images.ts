import 'reflect-metadata';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../config/mikro-orm.config';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';

// Map category names to Foodish API categories
// Available: burger, rice, pizza, pasta, biryani, dosa, idly, samosa, dessert
const categoryToFoodish: Record<string, string> = {
  'Lanches': 'burger',
  'Porções': 'rice',
  'Sopas': 'rice',
  'Executivos': 'rice',
  'Macaxeira': 'rice',
  'Cuscuz': 'rice',
  'Tapiocas': 'dosa', // closest to tapioca visually
  'Tapiocas Doces': 'dessert',
  'Bebidas': 'rice', // no drink category, will use fallback
  'Sucos': 'rice',
  'Refrigerantes': 'rice',
  'Cervejas': 'rice',
};

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 3000) return false;
    writeFileSync(filepath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function getFoodishImage(category: string): Promise<string | null> {
  try {
    const res = await fetch(`https://foodish-api.com/api/images/${category}`);
    const data = await res.json() as { image: string };
    return data.image || null;
  } catch {
    return null;
  }
}

async function main() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  const uploadDir = './uploads';
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const products = await em.find(Product, {}, { populate: ['category'] });
  console.log(`Found ${products.length} products\n`);

  let success = 0;
  let failed = 0;

  for (const product of products) {
    if (product.imageUrl) {
      console.log(`  SKIP ${product.name}`);
      continue;
    }

    const catName = (product.category as Category).name;
    const foodishCat = categoryToFoodish[catName] || 'rice';

    process.stdout.write(`  ${product.name} [${foodishCat}]... `);

    const imageUrl = await getFoodishImage(foodishCat);
    if (!imageUrl) {
      console.log('FAILED (no URL)');
      failed++;
      continue;
    }

    const filepath = `${uploadDir}/${product.id}.jpg`;
    const ok = await downloadImage(imageUrl, filepath);

    if (ok) {
      product.imageUrl = `/uploads/${product.id}.jpg`;
      success++;
      console.log('OK');
    } else {
      failed++;
      console.log('FAILED (download)');
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  await em.flush();
  console.log(`\nDone: ${success} downloaded, ${failed} failed`);
  await orm.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
