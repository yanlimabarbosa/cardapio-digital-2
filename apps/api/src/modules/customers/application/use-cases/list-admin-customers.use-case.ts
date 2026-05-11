import type { AdminCustomerReadRepository } from '../ports/admin-customer.read-repository.port';
import type { AdminCustomerReadModel } from '../read-models/admin-customer.read-model';

export class ListAdminCustomersUseCase {
  public constructor(private readonly customers: AdminCustomerReadRepository) {}

  public execute(search?: string): Promise<readonly AdminCustomerReadModel[]> {
    return this.customers.list(search);
  }
}
