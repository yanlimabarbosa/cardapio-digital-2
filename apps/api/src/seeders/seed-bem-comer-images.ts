import 'reflect-metadata';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../config/mikro-orm.config';
import { Product } from '../entities/product.entity';

type Pick =
  | { source: 'foodish'; category: string }
  | { source: 'commons'; query: string }
  | null;

function pickImageSource(title: string): Pick {
  const t = title.toLowerCase();
  // Desserts first — "cocada" contains "coca"
  if (
    t.includes('pudim') ||
    t.includes('cocada') ||
    t.includes('paçoca') ||
    t.includes('pacoca') ||
    t.includes('trufa') ||
    t.includes('doce de leite')
  ) {
    return { source: 'foodish', category: 'dessert' };
  }
  // Drinks → Wikimedia Commons (real product photos)
  if (t.includes('água com gás') || t.includes('agua com gas')) {
    return { source: 'commons', query: 'sparkling water bottle' };
  }
  if (t.includes('água') || t.includes('agua')) {
    return { source: 'commons', query: 'plastic water bottle 500ml' };
  }
  if (t.includes('h2o')) {
    return { source: 'commons', query: 'flavored water bottle' };
  }
  if (t.includes('coca')) {
    if (t.includes('zero') && t.includes('1l')) return { source: 'commons', query: 'coca cola zero bottle pet' };
    if (t.includes('1l')) return { source: 'commons', query: 'coca cola 2 liter' };
    if (t.includes('zero')) return { source: 'commons', query: 'coca cola zero can' };
    return { source: 'commons', query: 'coca cola 50cl can' };
  }
  if (t.includes('guaraná') || t.includes('guarana')) {
    if (t.includes('1l')) return { source: 'commons', query: 'guarana antarctica pet garrafa' };
    return { source: 'commons', query: 'guarana antarctica can' };
  }
  if (t.includes('fanta')) return { source: 'commons', query: 'fanta orange can' };
  if (t.includes('pepsi')) return { source: 'commons', query: 'pepsi can' };
  // Food
  if (t.includes('sopa')) return { source: 'foodish', category: 'rice' };
  if (t.includes('quentinha')) return { source: 'foodish', category: 'biryani' };
  if (t.includes('batata')) return { source: 'foodish', category: 'samosa' };
  return { source: 'foodish', category: 'rice' };
}

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'bem-comer-seeder/1.0' },
    });
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
    const data = (await res.json()) as { image: string };
    return data.image || null;
  } catch {
    return null;
  }
}

async function getCommonsImage(query: string): Promise<string | null> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      query,
    )}&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'bem-comer-seeder/1.0 (local dev)' } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string }> }> };
    };
    const pages = data.query?.pages;
    if (!pages) return null;
    const first = Object.values(pages)[0];
    const info = first?.imageinfo?.[0];
    return info?.thumburl || info?.url || null;
  } catch {
    return null;
  }
}

async function main() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  const uploadDir = './uploads';
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const products = await em.find(Product, {});
  console.log(`Found ${products.length} products`);

  const force = process.argv.includes('--force');
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const product of products) {
    if (product.imageUrl && !force) {
      console.log(`  SKIP ${product.name}`);
      skipped++;
      continue;
    }

    const pick = pickImageSource(product.name);
    if (!pick) {
      console.log(`  SKIP ${product.name} (no image source)`);
      skipped++;
      continue;
    }
    const label = pick.source === 'foodish' ? pick.category : `commons:${pick.query}`;
    process.stdout.write(`  ${product.name} [${label}]... `);

    let ok = false;
    const maxAttempts = pick.source === 'commons' ? 4 : 2;
    for (let attempt = 0; attempt < maxAttempts && !ok; attempt++) {
      let imageUrl: string | null = null;
      if (pick.source === 'foodish') {
        imageUrl = await getFoodishImage(pick.category);
      } else {
        imageUrl = await getCommonsImage(pick.query);
      }
      if (!imageUrl) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      const filepath = `${uploadDir}/${product.id}.jpg`;
      ok = await downloadImage(imageUrl, filepath);
      if (ok) product.imageUrl = `/uploads/${product.id}.jpg`;
      else await new Promise((r) => setTimeout(r, 800));
    }

    if (ok) {
      success++;
      console.log('OK');
    } else {
      failed++;
      console.log('FAILED');
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  await em.flush();
  console.log(`\nDone: ${success} downloaded, ${skipped} skipped, ${failed} failed`);
  await orm.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
