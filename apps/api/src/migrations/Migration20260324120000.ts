import { Migration } from '@mikro-orm/migrations';

export class Migration20260324120000 extends Migration {
  override async up(): Promise<void> {
    // Create delivery_areas table
    this.addSql(`
      create table "delivery_areas" (
        "id" uuid not null default gen_random_uuid(),
        "neighborhood" varchar(255) not null,
        "city" varchar(255) not null,
        "fee" decimal(10,2) not null,
        "normalized_key" varchar(255) not null,
        "is_active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        constraint "delivery_areas_pkey" primary key ("id"),
        constraint "delivery_areas_normalized_key_unique" unique ("normalized_key")
      );
    `);

    // Add delivery_fee column to orders
    this.addSql(`
      alter table "orders" add column "delivery_fee" decimal(10,2) null default null;
    `);

    // Seed delivery areas
    this.addSql(`
      insert into "delivery_areas" ("neighborhood", "city", "fee", "normalized_key") values
      ('Aeroclube', 'João Pessoa', 9.00, 'joao pessoa aeroclube'),
      ('Altiplano Cabo Branco', 'João Pessoa', 9.00, 'joao pessoa altiplano cabo branco'),
      ('Anatólia', 'João Pessoa', 12.00, 'joao pessoa anatolia'),
      ('Bairro das Indústrias', 'João Pessoa', 20.00, 'joao pessoa bairro das industrias'),
      ('Bairro dos Estados', 'João Pessoa', 10.00, 'joao pessoa bairro dos estados'),
      ('Bairro dos Ipês', 'João Pessoa', 11.00, 'joao pessoa bairro dos ipes'),
      ('Bairro dos Novais', 'João Pessoa', 19.00, 'joao pessoa bairro dos novais'),
      ('Bancários', 'João Pessoa', 12.00, 'joao pessoa bancarios'),
      ('Bela Vista', 'João Pessoa', 12.00, 'joao pessoa bela vista'),
      ('Bessa', 'João Pessoa', 10.00, 'joao pessoa bessa'),
      ('Brisamar', 'João Pessoa', 8.00, 'joao pessoa brisamar'),
      ('Cabo Branco', 'João Pessoa', 8.00, 'joao pessoa cabo branco'),
      ('Centro', 'Cabedelo', 18.00, 'cabedelo centro'),
      ('Centro', 'João Pessoa', 12.00, 'joao pessoa centro'),
      ('Centro', 'Santa Rita', 27.00, 'santa rita centro'),
      ('Cidade Universitária', 'João Pessoa', 12.00, 'joao pessoa cidade universitaria'),
      ('Costa e Silva', 'João Pessoa', 18.00, 'joao pessoa costa e silva'),
      ('Cristo Redentor', 'João Pessoa', 15.00, 'joao pessoa cristo redentor'),
      ('Cruz das Armas', 'João Pessoa', 17.00, 'joao pessoa cruz das armas'),
      ('Cuiá', 'João Pessoa', 17.00, 'joao pessoa cuia'),
      ('Ernani Sátiro', 'João Pessoa', 15.00, 'joao pessoa ernani satiro'),
      ('Ernesto Geisel', 'João Pessoa', 17.00, 'joao pessoa ernesto geisel'),
      ('Expedicionários', 'João Pessoa', 9.00, 'joao pessoa expedicionarios'),
      ('Funcionários', 'João Pessoa', 15.00, 'joao pessoa funcionarios'),
      ('Gramame', 'João Pessoa', 26.00, 'joao pessoa gramame'),
      ('Grotão', 'João Pessoa', 20.00, 'joao pessoa grotao'),
      ('Intermares', 'Cabedelo', 12.00, 'cabedelo intermares'),
      ('Jaguaribe', 'João Pessoa', 12.00, 'joao pessoa jaguaribe'),
      ('Jardim Oceania', 'João Pessoa', 9.00, 'joao pessoa jardim oceania'),
      ('Jardim São Paulo', 'João Pessoa', 12.00, 'joao pessoa jardim sao paulo'),
      ('Manaíra', 'João Pessoa', 8.00, 'joao pessoa manaira'),
      ('Mangabeira', 'João Pessoa', 15.00, 'joao pessoa mangabeira'),
      ('Miramar', 'João Pessoa', 9.00, 'joao pessoa miramar'),
      ('Tambauzinho', 'João Pessoa', 9.00, 'joao pessoa tambauzinho'),
      ('Tambaú', 'João Pessoa', 7.00, 'joao pessoa tambau'),
      ('Varjão', 'João Pessoa', 15.00, 'joao pessoa varjao'),
      ('Água Fria', 'João Pessoa', 14.00, 'joao pessoa agua fria');
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "delivery_areas";`);
    this.addSql(`alter table "orders" drop column if exists "delivery_fee";`);
  }
}
