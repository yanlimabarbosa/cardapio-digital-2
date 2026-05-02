import 'reflect-metadata';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../config/mikro-orm.config';
import { Product } from '../entities/product.entity';
import { ProductExtra } from '../entities/product-extra.entity';

const DEFAULT_SOURCE_DIR = '/home/yan/Downloads/bemcomercardapio';
const UPLOAD_SUBDIR = 'bemcomer-ingredients';

const SOURCE_RENAMES: Record<string, string> = {
  'feijao-cariocajpeg': 'feijao-carioca.jpeg',
};

const OPTION_IMAGE_BY_NAME: Record<string, string> = {
  abacaxi: 'abacaxi.jpeg',
  alcatra: 'alcatra.jpeg',
  alface: 'alface.jpeg',
  'arroz branco': 'arroz-branco.jpeg',
  'arroz de leite': 'arroz-branco.jpeg',
  'arroz refogado': 'arroz-refogado.jpeg',
  beterraba: 'beterraba.jpeg',
  'carne de sol acebolada': 'carne-guisada.jpeg',
  'carne guisada': 'carne-guisada.jpeg',
  'coxa e sobrecoxa de frango': 'frango-assado.jpeg',
  cupim: 'cupim-no-bafo.jpeg',
  cuscuz: 'cuscuz.jpeg',
  farofa: 'farofa.jpeg',
  'farofa de cuscuz': 'farofa.jpeg',
  'feijao carioca': 'feijao-carioca.jpeg',
  'feijao macassar na farofa': 'feijao-macassa.jpeg',
  'feijao preto': 'feijao-preto.jpeg',
  'figado acebolado': 'carne-guisada.jpeg',
  'file de frango empanado': 'frango-frito.jpeg',
  fraldinha: 'alcatra.jpeg',
  'frango guisado': 'galinha-guisada.jpeg',
  inhame: 'batata-cozida.jpeg',
  'linguica de frango': 'linguica-frango.jpeg',
  'linguica mista': 'linguica-toscana.jpeg',
  macarrao: 'macarrao.jpeg',
  macaxeira: 'batata-doce.jpeg',
  maminha: 'maminha.jpeg',
  'mistao churrasco': 'maminha.jpeg',
  pepino: 'pepino.jpeg',
  'pirao de carne': 'pirao-carne.jpeg',
  'pure de macaxeira': 'pure-de-macaxeira.jpeg',
  'repolho e cenoura na maionese': 'cenoura-ralada.jpeg',
  rubacao: 'rubacao.jpeg',
  'sopa de carne': 'pirao-carne.jpeg',
  'sopa de feijao': 'feijao-carioca.jpeg',
  tomate: 'tomate.jpeg',
  'verduras na maionese': 'maionese.jpeg',
  vinagrete: 'vinagrete.jpeg',
};

const PRODUCT_IMAGE_BY_NAME: Record<string, string> = {
  'batata frita p': 'batata-frita.jpeg',
  'batata frita g': 'batata-frita.jpeg',
};

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function publicUrl(filename: string): string {
  return `/uploads/${UPLOAD_SUBDIR}/${filename}`;
}

function copySourceImages(sourceDir: string, uploadDir: string): number {
  mkdirSync(uploadDir, { recursive: true });

  let copied = 0;
  for (const sourceName of readdirSync(sourceDir)) {
    const sourcePath = join(sourceDir, sourceName);
    if (!statSync(sourcePath).isFile()) continue;

    const targetName = SOURCE_RENAMES[sourceName] ?? sourceName;
    copyFileSync(sourcePath, join(uploadDir, targetName));
    copied++;
  }
  return copied;
}

async function main() {
  const sourceDir = process.argv.slice(2).find((arg) => arg !== '--') || DEFAULT_SOURCE_DIR;
  if (!existsSync(sourceDir)) {
    throw new Error(`Source image directory not found: ${sourceDir}`);
  }

  const uploadDir = join(process.cwd(), 'uploads', UPLOAD_SUBDIR);
  const copied = copySourceImages(sourceDir, uploadDir);

  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  const extras = await em.find(ProductExtra, {});
  const missingOptions = new Set<string>();
  let updatedOptions = 0;

  for (const extra of extras) {
    const imageFile = OPTION_IMAGE_BY_NAME[normalizeName(extra.name)];
    if (!imageFile) {
      missingOptions.add(extra.name);
      continue;
    }
    extra.imageUrl = publicUrl(imageFile);
    updatedOptions++;
  }

  const products = await em.find(Product, {});
  let updatedProducts = 0;
  for (const product of products) {
    const imageFile = PRODUCT_IMAGE_BY_NAME[normalizeName(product.name)];
    if (!imageFile) continue;
    product.imageUrl = publicUrl(imageFile);
    updatedProducts++;
  }

  await em.flush();
  await orm.close();

  console.log(`Copied ${copied} images to ${uploadDir}`);
  console.log(`Updated ${updatedOptions} ingredient option rows`);
  console.log(`Updated ${updatedProducts} product rows`);
  if (missingOptions.size > 0) {
    console.log(`No image mapping for: ${Array.from(missingOptions).sort().join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
