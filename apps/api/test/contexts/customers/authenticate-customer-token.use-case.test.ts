import assert from 'node:assert/strict';
import test from 'node:test';
import type { CustomerTokenAuthRepository } from '../../../src/modules/customers/application/ports/customer-token-auth.repository.port';
import type { AuthenticatedCustomerReadModel } from '../../../src/modules/customers/application/read-models/authenticated-customer.read-model';
import { AuthenticateCustomerTokenUseCase } from '../../../src/modules/customers/application/use-cases/authenticate-customer-token.use-case';

const VALID_TOKEN = '00000000-0000-4000-8000-000000000001';

test('authenticates a valid customer token through the repository', async (): Promise<void> => {
  const customer: AuthenticatedCustomerReadModel = { id: 'customer-1' };
  const repository = new FakeCustomerTokenAuthRepository(customer);
  const useCase = new AuthenticateCustomerTokenUseCase(repository);

  const result = await useCase.execute({ token: VALID_TOKEN });

  assert.deepEqual(result, customer);
  assert.deepEqual(repository.tokens, [VALID_TOKEN]);
});

test('returns null when the customer token is malformed', async (): Promise<void> => {
  const repository = new FakeCustomerTokenAuthRepository({ id: 'customer-1' });
  const useCase = new AuthenticateCustomerTokenUseCase(repository);

  const result = await useCase.execute({ token: 'not-a-token' });

  assert.equal(result, null);
  assert.deepEqual(repository.tokens, []);
});

test('returns null when the repository cannot find an active customer', async (): Promise<void> => {
  const repository = new FakeCustomerTokenAuthRepository(null);
  const useCase = new AuthenticateCustomerTokenUseCase(repository);

  const result = await useCase.execute({ token: VALID_TOKEN });

  assert.equal(result, null);
  assert.deepEqual(repository.tokens, [VALID_TOKEN]);
});

class FakeCustomerTokenAuthRepository implements CustomerTokenAuthRepository {
  public readonly tokens: string[] = [];

  public constructor(private readonly customer: AuthenticatedCustomerReadModel | null) {}

  public async findByToken(token: string): Promise<AuthenticatedCustomerReadModel | null> {
    this.tokens.push(token);

    return this.customer;
  }
}
