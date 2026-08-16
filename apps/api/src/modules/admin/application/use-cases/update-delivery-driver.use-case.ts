import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DeliveryDriver } from '../../../../entities/delivery-driver.entity';

export type UpdateDeliveryDriverCommand = {
  id: string;
  name?: string;
  phone?: string;
  isActive?: boolean;
  calculatesFee?: boolean;
};

@Injectable()
export class UpdateDeliveryDriverUseCase {
  constructor(private readonly em: EntityManager) {}

  public async execute(command: UpdateDeliveryDriverCommand): Promise<void> {
    const driver = await this.em.findOne(DeliveryDriver, { id: command.id });
    if (!driver) {
      throw new NotFoundException('Motoboy não encontrado');
    }

    if (command.name !== undefined) driver.name = command.name;
    if (command.phone !== undefined) driver.phone = command.phone;
    if (command.isActive !== undefined) driver.isActive = command.isActive;
    if (command.calculatesFee !== undefined) driver.calculatesFee = command.calculatesFee;
    
    await this.em.flush();
  }
}
