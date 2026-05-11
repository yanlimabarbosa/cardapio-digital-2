import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import {
  CustomerNotFoundError,
  CustomerPasswordAlreadySetError,
} from '../errors/customer.errors';
import type {
  CustomerPasswordModel,
  CustomerPasswordRepository,
} from '../ports/customer-password.repository.port';

export type SetCustomerPasswordCommand = {
  readonly customerId: string;
  readonly password: string;
};

export type SetCustomerPasswordResult = {
  readonly customer: CustomerPasswordModel;
};

export class SetCustomerPasswordUseCase {
  public constructor(
    private readonly customers: CustomerPasswordRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: SetCustomerPasswordCommand): Promise<SetCustomerPasswordResult> {
    const result = await this.unitOfWork.run((context) =>
      this.customers.setPassword(
        {
          customerId: command.customerId,
          password: command.password,
        },
        context,
      ),
    );

    if (result.status === 'not-found') {
      throw new CustomerNotFoundError();
    }

    if (result.status === 'already-set') {
      throw new CustomerPasswordAlreadySetError();
    }

    return {
      customer: result.customer,
    };
  }
}
