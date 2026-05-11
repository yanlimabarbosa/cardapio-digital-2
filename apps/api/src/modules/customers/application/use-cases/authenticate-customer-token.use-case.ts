import { CustomerToken } from '../../domain/customer-token.value-object';
import type { CustomerTokenAuthRepository } from '../ports/customer-token-auth.repository.port';
import type { AuthenticatedCustomerReadModel } from '../read-models/authenticated-customer.read-model';

export type AuthenticateCustomerTokenCommand = {
  readonly token: string;
};

export class AuthenticateCustomerTokenUseCase {
  public constructor(private readonly customers: CustomerTokenAuthRepository) {}

  public async execute(
    command: AuthenticateCustomerTokenCommand,
  ): Promise<AuthenticatedCustomerReadModel | null> {
    const token = CustomerToken.parse(command.token);

    if (!token) {
      return null;
    }

    return this.customers.findByToken(token.value);
  }
}
