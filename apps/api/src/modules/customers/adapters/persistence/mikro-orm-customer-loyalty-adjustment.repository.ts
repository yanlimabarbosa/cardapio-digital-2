import { Logger } from '@nestjs/common';
import { Customer, LoyaltyTransaction } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  ApplyCustomerLoyaltyAdjustmentCommand,
  ApplyCustomerLoyaltyAdjustmentResult,
  CustomerLoyaltyAdjustmentRepository,
  CustomerLoyaltyAdjustmentTarget,
} from '../../application/ports/customer-loyalty-adjustment.repository.port';

export class MikroOrmCustomerLoyaltyAdjustmentRepository
  implements CustomerLoyaltyAdjustmentRepository
{
  private readonly logger: Logger = new Logger(MikroOrmCustomerLoyaltyAdjustmentRepository.name);

  public async findTarget(
    customerId: string,
    context: TransactionContext,
  ): Promise<CustomerLoyaltyAdjustmentTarget | null> {
    const em = getMikroOrmEntityManager(context);
    const customer = await em.findOne(Customer, { id: customerId });

    if (!customer) {
      return null;
    }

    return {
      id: customer.id,
      phone: customer.phone,
      balance: customer.loyaltyPoints,
    };
  }

  public async applyAdjustment(
    command: ApplyCustomerLoyaltyAdjustmentCommand,
    context: TransactionContext,
  ): Promise<ApplyCustomerLoyaltyAdjustmentResult> {
    const em = getMikroOrmEntityManager(context);
    const result = await em.getConnection().execute<{ loyalty_points: number }[]>(
      `UPDATE "customers"
       SET "loyalty_points" = "loyalty_points" + ?
       WHERE "id" = ? AND "loyalty_points" + ? >= 0
       RETURNING "loyalty_points"`,
      [command.points, command.customerId, command.points],
    );
    const updatedBalance = result[0]?.loyalty_points;

    if (updatedBalance === undefined) {
      return { status: 'insufficient-balance' };
    }

    const transaction = em.create(LoyaltyTransaction, {
      customer: em.getReference(Customer, command.customerId),
      points: command.points,
      type: 'adjustment',
      description: command.description,
    });
    await em.flush();

    const balance = Number(updatedBalance);
    this.logger.log(
      `Loyalty adjust: customer=${command.customerPhone} points=${command.points} new_balance=${balance}`,
    );

    return {
      status: 'adjusted',
      balance,
      transaction: {
        id: transaction.id,
        points: transaction.points,
        type: 'adjustment',
      },
    };
  }
}
