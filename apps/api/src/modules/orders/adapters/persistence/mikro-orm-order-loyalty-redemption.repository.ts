import { EntityManager } from '@mikro-orm/postgresql';
import { Customer, LoyaltyTransaction, Order } from '../../../../entities';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  DebitOrderLoyaltyRedemptionCommand,
  OrderLoyaltyRedemptionDebitResult,
  OrderLoyaltyRedemptionRepository,
  RecordOrderLoyaltyRedemptionCommand,
} from '../../application/ports/order-loyalty-redemption.port';

export class MikroOrmOrderLoyaltyRedemptionRepository implements OrderLoyaltyRedemptionRepository {
  public constructor(private readonly em: EntityManager) {}

  public async debitPoints(
    command: DebitOrderLoyaltyRedemptionCommand,
  ): Promise<OrderLoyaltyRedemptionDebitResult> {
    const em = command.context ? getMikroOrmEntityManager(command.context) : this.em.fork();
    const result = await em.getConnection().execute(
      `UPDATE "customers" SET "loyalty_points" = "loyalty_points" - ? WHERE "id" = ? AND "loyalty_points" >= ? RETURNING "loyalty_points"`,
      [command.points, command.customerId, command.points],
    );

    return { debited: Array.isArray(result) && result.length > 0 };
  }

  public async recordRedemption(command: RecordOrderLoyaltyRedemptionCommand): Promise<void> {
    const em = command.context ? getMikroOrmEntityManager(command.context) : this.em.fork();

    em.create(LoyaltyTransaction, {
      customer: em.getReference(Customer, command.customerId),
      order: em.getReference(Order, command.orderId),
      points: -command.points,
      type: 'redeem',
      description: `Resgate — Pedido #${command.orderNumber}`,
    });

    await em.flush();
  }
}
