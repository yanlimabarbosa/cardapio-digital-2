import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DeliveryDriver } from '../../../../entities/delivery-driver.entity';

export type CreateDeliveryDriverCommand = {
  name: string;
  phone: string;
  isActive?: boolean;
  calculatesFee?: boolean;
};

@Injectable()
export class CreateDeliveryDriverUseCase {
  constructor(private readonly em: EntityManager) {}

  public async execute(command: CreateDeliveryDriverCommand): Promise<{ id: string }> {
    const driver = this.em.create(DeliveryDriver, {
      name: command.name,
      phone: command.phone,
      isActive: command.isActive ?? true,
      calculatesFee: command.calculatesFee ?? false,
      balanceCents: 0,
    });
    
    await this.em.persistAndFlush(driver);
    return { id: driver.id };
  }
}
