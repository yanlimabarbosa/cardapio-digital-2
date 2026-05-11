import { CustomerProfileNotFoundError } from '../errors/customer.errors';
import type { CustomerProfileReadRepository } from '../ports/customer-profile.read-repository.port';
import type { CustomerProfileReadModel } from '../read-models/customer-profile.read-model';

export class GetCustomerProfileUseCase {
  public constructor(private readonly profiles: CustomerProfileReadRepository) {}

  public async execute(customerId: string): Promise<CustomerProfileReadModel> {
    const profile = await this.profiles.getByCustomerId(customerId);

    if (!profile) {
      throw new CustomerProfileNotFoundError();
    }

    return profile;
  }
}
