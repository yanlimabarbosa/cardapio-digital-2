import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DeliveryDriver } from '../../../../entities/delivery-driver.entity';

@Injectable()
export class DeleteDeliveryDriverUseCase {
  constructor(private readonly em: EntityManager) {}

  public async execute(id: string): Promise<void> {
    const driver = await this.em.findOne(DeliveryDriver, { id });
    if (!driver) {
      throw new NotFoundException('Motoboy não encontrado');
    }
    
    // Check if there are orders for this driver, if so, deactivate instead of delete, 
    // or just allow delete since FK is set null. We will just delete for now, or deactivate if preferred.
    // Given the simplicity, let's delete.
    await this.em.removeAndFlush(driver);
  }
}
