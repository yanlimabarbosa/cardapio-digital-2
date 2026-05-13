import { Migration } from '@mikro-orm/migrations';

export class Migration20260513120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "delivery_areas" add column if not exists "label" varchar(255) null;`);

    this.canonicalizeLegacyArea('Bairro das Indústrias', 'Indústrias');
    this.canonicalizeLegacyArea('Bairro dos Estados', 'Estados');
    this.canonicalizeLegacyArea('Bairro dos Ipês', 'Ipês');
    this.canonicalizeLegacyArea('Mangabeira IV', 'Mangabeira');
    this.canonicalizeLegacyArea('Novo Geisel', 'Ernesto Geisel');
    this.canonicalizeLegacyArea('Valentina', 'Valentina de Figueiredo');

    this.addSql(`
      insert into "delivery_areas" ("neighborhood", "city", "fee", "normalized_key", "is_active") values
      ('Aeroclube', 'João Pessoa', 0.00, 'joao pessoa aeroclube', false),
      ('Água Fria', 'João Pessoa', 0.00, 'joao pessoa agua fria', false),
      ('Altiplano Cabo Branco', 'João Pessoa', 0.00, 'joao pessoa altiplano cabo branco', false),
      ('Alto do Céu', 'João Pessoa', 0.00, 'joao pessoa alto do ceu', false),
      ('Alto do Mateus', 'João Pessoa', 0.00, 'joao pessoa alto do mateus', false),
      ('Anatólia', 'João Pessoa', 0.00, 'joao pessoa anatolia', false),
      ('Área Rural de João Pessoa', 'João Pessoa', 0.00, 'joao pessoa area rural de joao pessoa', false),
      ('Bancários', 'João Pessoa', 0.00, 'joao pessoa bancarios', false),
      ('Barra de Gramame', 'João Pessoa', 0.00, 'joao pessoa barra de gramame', false),
      ('Bessa', 'João Pessoa', 0.00, 'joao pessoa bessa', false),
      ('Brisamar', 'João Pessoa', 0.00, 'joao pessoa brisamar', false),
      ('Cabo Branco', 'João Pessoa', 0.00, 'joao pessoa cabo branco', false),
      ('Castelo Branco', 'João Pessoa', 0.00, 'joao pessoa castelo branco', false),
      ('Centro', 'João Pessoa', 0.00, 'joao pessoa centro', false),
      ('Cidade dos Colibris', 'João Pessoa', 0.00, 'joao pessoa cidade dos colibris', false),
      ('Costa do Sol', 'João Pessoa', 0.00, 'joao pessoa costa do sol', false),
      ('Costa e Silva', 'João Pessoa', 0.00, 'joao pessoa costa e silva', false),
      ('Cristo Redentor', 'João Pessoa', 0.00, 'joao pessoa cristo redentor', false),
      ('Cruz das Armas', 'João Pessoa', 0.00, 'joao pessoa cruz das armas', false),
      ('Cuiá', 'João Pessoa', 0.00, 'joao pessoa cuia', false),
      ('Distrito Industrial', 'João Pessoa', 0.00, 'joao pessoa distrito industrial', false),
      ('Ernani Sátiro', 'João Pessoa', 0.00, 'joao pessoa ernani satiro', false),
      ('Ernesto Geisel', 'João Pessoa', 0.00, 'joao pessoa ernesto geisel', false),
      ('Estados', 'João Pessoa', 0.00, 'joao pessoa estados', false),
      ('Expedicionários', 'João Pessoa', 0.00, 'joao pessoa expedicionarios', false),
      ('Funcionários', 'João Pessoa', 0.00, 'joao pessoa funcionarios', false),
      ('Gramame', 'João Pessoa', 0.00, 'joao pessoa gramame', false),
      ('Grotão', 'João Pessoa', 0.00, 'joao pessoa grotao', false),
      ('Ilha do Bispo', 'João Pessoa', 0.00, 'joao pessoa ilha do bispo', false),
      ('Indústrias', 'João Pessoa', 0.00, 'joao pessoa industrias', false),
      ('Ipês', 'João Pessoa', 0.00, 'joao pessoa ipes', false),
      ('Jaguaribe', 'João Pessoa', 0.00, 'joao pessoa jaguaribe', false),
      ('Jardim Cidade Universitária', 'João Pessoa', 0.00, 'joao pessoa jardim cidade universitaria', false),
      ('Jardim Oceania', 'João Pessoa', 0.00, 'joao pessoa jardim oceania', false),
      ('Jardim São Paulo', 'João Pessoa', 0.00, 'joao pessoa jardim sao paulo', false),
      ('Jardim Veneza', 'João Pessoa', 0.00, 'joao pessoa jardim veneza', false),
      ('João Agripino', 'João Pessoa', 0.00, 'joao pessoa joao agripino', false),
      ('João Paulo II', 'João Pessoa', 0.00, 'joao pessoa joao paulo ii', false),
      ('José Américo de Almeida', 'João Pessoa', 0.00, 'joao pessoa jose americo de almeida', false),
      ('Manaíra', 'João Pessoa', 0.00, 'joao pessoa manaira', false),
      ('Mandacaru', 'João Pessoa', 0.00, 'joao pessoa mandacaru', false),
      ('Mangabeira', 'João Pessoa', 0.00, 'joao pessoa mangabeira', false),
      ('Miramar', 'João Pessoa', 0.00, 'joao pessoa miramar', false),
      ('Muçumagro', 'João Pessoa', 0.00, 'joao pessoa mucumagro', false),
      ('Mumbaba', 'João Pessoa', 0.00, 'joao pessoa mumbaba', false),
      ('Oitizeiro', 'João Pessoa', 0.00, 'joao pessoa oitizeiro', false),
      ('Padre Zé', 'João Pessoa', 0.00, 'joao pessoa padre ze', false),
      ('Paratibe', 'João Pessoa', 0.00, 'joao pessoa paratibe', false),
      ('Pedro Gondim', 'João Pessoa', 0.00, 'joao pessoa pedro gondim', false),
      ('Penha', 'João Pessoa', 0.00, 'joao pessoa penha', false),
      ('Planalto Boa Esperança', 'João Pessoa', 0.00, 'joao pessoa planalto boa esperanca', false),
      ('Ponta do Seixas', 'João Pessoa', 0.00, 'joao pessoa ponta do seixas', false),
      ('Portal do Sol', 'João Pessoa', 0.00, 'joao pessoa portal do sol', false),
      ('Roger', 'João Pessoa', 0.00, 'joao pessoa roger', false),
      ('São José', 'João Pessoa', 0.00, 'joao pessoa sao jose', false),
      ('Tambaú', 'João Pessoa', 0.00, 'joao pessoa tambau', false),
      ('Tambauzinho', 'João Pessoa', 0.00, 'joao pessoa tambauzinho', false),
      ('Tambiá', 'João Pessoa', 0.00, 'joao pessoa tambia', false),
      ('Torre', 'João Pessoa', 0.00, 'joao pessoa torre', false),
      ('Treze de Maio', 'João Pessoa', 0.00, 'joao pessoa treze de maio', false),
      ('Trincheiras', 'João Pessoa', 0.00, 'joao pessoa trincheiras', false),
      ('Valentina de Figueiredo', 'João Pessoa', 0.00, 'joao pessoa valentina de figueiredo', false),
      ('Varadouro', 'João Pessoa', 0.00, 'joao pessoa varadouro', false),
      ('Varjão', 'João Pessoa', 0.00, 'joao pessoa varjao', false)
      on conflict ("normalized_key") do nothing;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "delivery_areas" drop column if exists "label";`);
  }

  private canonicalizeLegacyArea(previousNeighborhood: string, nextNeighborhood: string): void {
    const previousKey = this.normalizedKey(previousNeighborhood);
    const nextKey = this.normalizedKey(nextNeighborhood);

    this.addSql(`
      update "delivery_areas"
      set
        "neighborhood" = '${this.escapeSql(nextNeighborhood)}',
        "label" = coalesce("label", '${this.escapeSql(previousNeighborhood)}'),
        "normalized_key" = '${nextKey}'
      where "city" = 'João Pessoa'
        and "normalized_key" = '${previousKey}'
        and not exists (
          select 1 from "delivery_areas" existing
          where existing."normalized_key" = '${nextKey}'
        );
    `);
  }

  private normalizedKey(neighborhood: string): string {
    return `joao pessoa ${neighborhood
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()}`;
  }

  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }
}
