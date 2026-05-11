import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { CustomerPhone } from '../../domain/customer-phone.value-object';
import {
  CustomerInvalidCredentialsError,
  CustomerInvalidPasswordError,
} from '../errors/customer.errors';
import type {
  CustomerLoginModel,
  CustomerLoginRepository,
} from '../ports/customer-login.repository.port';

export type LoginCustomerCommand = {
  readonly password: string;
  readonly phone: string;
};

export type LoginCustomerResult = {
  readonly customer: CustomerLoginModel;
  readonly token: string;
};

export class LoginCustomerUseCase {
  public constructor(
    private readonly customers: CustomerLoginRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: LoginCustomerCommand): Promise<LoginCustomerResult> {
    const phone = CustomerPhone.from(command.phone);
    const result = await this.unitOfWork.run((context) =>
      this.customers.login(
        {
          phone,
          password: command.password,
        },
        context,
      ),
    );

    if (result.status === 'invalid-credentials') {
      throw new CustomerInvalidCredentialsError();
    }

    if (result.status === 'invalid-password') {
      throw new CustomerInvalidPasswordError();
    }

    return {
      token: result.token,
      customer: result.customer,
    };
  }
}
