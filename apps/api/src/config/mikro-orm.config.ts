import * as dotenv from 'dotenv';
import { join } from 'path';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

dotenv.config({ path: join(__dirname, '../../../../.env') });
dotenv.config({ path: join(__dirname, '../../.env') });

export default defineConfig({
  clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5436/cardapio_digital_2',
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  extensions: [Migrator],
  migrations: {
    path: './dist/migrations',
    pathTs: './src/migrations',
  },
  debug: process.env.NODE_ENV !== 'production',
});
