import { EntityManager } from '@mikro-orm/postgresql';
import { Order } from '../../../../entities/order.entity';
import { DeliveryDriver } from '../../../../entities/delivery-driver.entity';

export type AssignDriverCommand = {
  readonly orderId: string;
  readonly driverId: string;
};

export class AssignDriverNotFoundError extends Error {
  public override readonly name = 'AssignDriverNotFoundError';
}

export class AssignDriverUseCase {
  constructor(private readonly em: EntityManager) {}

  public async execute(command: AssignDriverCommand): Promise<void> {
    const order = await this.em.findOne(Order, { id: command.orderId });
    if (!order) {
      throw new AssignDriverNotFoundError(`Pedido ${command.orderId} não encontrado`);
    }

    const driver = await this.em.findOne(DeliveryDriver, { id: command.driverId });
    if (!driver) {
      throw new AssignDriverNotFoundError(`Motoboy ${command.driverId} não encontrado`);
    }

    const wasUnassigned = !order.driver;

    order.driver = driver;
    order.driverName = driver.name;

    if (wasUnassigned && driver.calculatesFee && order.deliveryFee) {
      driver.balanceCents += Number(order.deliveryFee);
    }

    await this.em.flush();
  }
}
