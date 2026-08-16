import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

@Injectable()
export class ClearTestDataUseCase {
  constructor(private readonly em: EntityManager) {}

  public async execute(): Promise<{ success: boolean; message: string }> {
    await this.em.begin();
    try {
      // Truncate tables in reverse order of foreign key dependencies, or cascade
      // We keep admin_users, store_settings, delivery_areas, and delivery_drivers.
      // Wait, we delete delivery drivers? No, the user wants test data cleared, driver is new.
      // We will cascade truncate the transactional tables.
      await this.em.getConnection().execute(`
        TRUNCATE TABLE 
          "orders", 
          "order_items", 
          "customers", 
          "loyalty_transactions",
          "coupon_usages"
        CASCADE;
      `);
      await this.em.commit();
      return { success: true, message: 'Dados de teste removidos com sucesso.' };
    } catch (error) {
      await this.em.rollback();
      throw error;
    }
  }
}
