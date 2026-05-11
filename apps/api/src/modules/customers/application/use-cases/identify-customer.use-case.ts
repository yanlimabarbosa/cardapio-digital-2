import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { CustomerPhone } from '../../domain/customer-phone.value-object';
import type {
  CustomerIdentityModel,
  CustomerIdentityRepository,
} from '../ports/customer-identity.repository.port';

export type IdentifyCustomerCommand = {
  readonly phone: string;
};

export type IdentifyCustomerResult =
  | {
      readonly action: 'register';
      readonly exists: false;
    }
  | {
      readonly action: 'login';
      readonly exists: true;
      readonly hasPassword: true;
    }
  | {
      readonly action: 'authenticated';
      readonly customer: CustomerIdentityModel;
      readonly exists: true;
      readonly hasPassword: false;
      readonly token: string;
    };

export class IdentifyCustomerUseCase {
  public constructor(
    private readonly customers: CustomerIdentityRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: IdentifyCustomerCommand): Promise<IdentifyCustomerResult> {
    const phone = CustomerPhone.from(command.phone);
    const result = await this.unitOfWork.run((context) =>
      this.customers.identifyByPhone(phone, context),
    );

    if (result.status === 'missing') {
      return {
        exists: false,
        action: 'register',
      };
    }

    if (result.status === 'password-required') {
      return {
        exists: true,
        hasPassword: true,
        action: 'login',
      };
    }

    return {
      exists: true,
      hasPassword: false,
      action: 'authenticated',
      token: result.token,
      customer: result.customer,
    };
  }
}
