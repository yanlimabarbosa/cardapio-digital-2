import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { LoyaltyPointsPolicy } from '../../../../shared/domain/loyalty-points.policy';
import {
  CustomerLoyaltyAdjustmentRejectedError,
  CustomerNotFoundError,
} from '../errors/customer.errors';
import type {
  CustomerLoyaltyAdjustmentRepository,
  CustomerLoyaltyAdjustmentTransactionModel,
} from '../ports/customer-loyalty-adjustment.repository.port';

export type AdjustCustomerLoyaltyCommand = {
  readonly customerId: string;
  readonly description?: string;
  readonly points: number;
};

export type AdjustCustomerLoyaltyResult = {
  readonly balance: number;
  readonly transaction: CustomerLoyaltyAdjustmentTransactionModel;
};

export class AdjustCustomerLoyaltyUseCase {
  public constructor(
    private readonly loyalty: CustomerLoyaltyAdjustmentRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: AdjustCustomerLoyaltyCommand): Promise<AdjustCustomerLoyaltyResult> {
    return this.unitOfWork.run(async (context) => {
      const target = await this.loyalty.findTarget(command.customerId, context);

      if (!target) {
        throw new CustomerNotFoundError();
      }

      const policy = LoyaltyPointsPolicy.forBalance(target.balance);
      const decision = policy.adjust(command.points);

      if (!decision.allowed) {
        throw new CustomerLoyaltyAdjustmentRejectedError(decision.reason);
      }

      const result = await this.loyalty.applyAdjustment(
        {
          customerId: target.id,
          customerPhone: target.phone,
          points: command.points,
          description:
            command.description || policy.defaultAdjustmentDescription(command.points),
        },
        context,
      );

      if (result.status === 'insufficient-balance') {
        throw new CustomerLoyaltyAdjustmentRejectedError('Saldo insuficiente de pontos');
      }

      return {
        balance: result.balance,
        transaction: result.transaction,
      };
    });
  }
}
