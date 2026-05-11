import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { CustomerPhone } from '../../domain/customer-phone.value-object';
import { CustomerAlreadyExistsError } from '../errors/customer.errors';
import type {
  CustomerRegistrationModel,
  CustomerRegistrationRepository,
} from '../ports/customer-registration.repository.port';

export type RegisterCustomerCommand = {
  readonly name: string;
  readonly password: string;
  readonly phone: string;
};

export type RegisterCustomerResult = {
  readonly customer: CustomerRegistrationModel;
  readonly token: string;
};

export class RegisterCustomerUseCase {
  public constructor(
    private readonly customers: CustomerRegistrationRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: RegisterCustomerCommand): Promise<RegisterCustomerResult> {
    const phone = CustomerPhone.from(command.phone);
    const result = await this.unitOfWork.run((context) =>
      this.customers.register(
        {
          phone,
          name: command.name,
          password: command.password,
        },
        context,
      ),
    );

    if (result.status === 'duplicate-phone') {
      throw new CustomerAlreadyExistsError();
    }

    return {
      token: result.token,
      customer: result.customer,
    };
  }
}
