import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DeliveryDriver } from '../../../../entities/delivery-driver.entity';

export type DeliveryDriverModel = {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  calculatesFee: boolean;
  balanceCents: number;
  createdAt: string;
};

@Injectable()
export class ListDeliveryDriversUseCase {
  constructor(private readonly em: EntityManager) {}

  public async execute(): Promise<DeliveryDriverModel[]> {
    const drivers = await this.em.find(DeliveryDriver, {}, { orderBy: { name: 'ASC' } });
    return drivers.map(d => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      isActive: d.isActive,
      calculatesFee: d.calculatesFee,
      balanceCents: d.balanceCents,
      createdAt: d.createdAt!.toISOString(),
    }));
  }
}
