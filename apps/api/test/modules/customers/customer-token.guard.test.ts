import assert from 'node:assert/strict';
import test from 'node:test';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { CustomerTokenAuthRepository } from '../../../src/modules/customers/application/ports/customer-token-auth.repository.port';
import type { AuthenticatedCustomerReadModel } from '../../../src/modules/customers/application/read-models/authenticated-customer.read-model';
import { AuthenticateCustomerTokenUseCase } from '../../../src/modules/customers/application/use-cases/authenticate-customer-token.use-case';
import { CustomerTokenGuard } from '../../../src/modules/customers/customer-token.guard';

const VALID_TOKEN = '00000000-0000-4000-8000-000000000001';

test('attaches an authenticated customer read model to the request', async (): Promise<void> => {
  const customer: AuthenticatedCustomerReadModel = { id: 'customer-1' };
  const repository = new FakeCustomerTokenAuthRepository(customer);
  const guard = new CustomerTokenGuard(new AuthenticateCustomerTokenUseCase(repository));
  const request = createRequest({ 'x-customer-token': VALID_TOKEN });

  const result = await guard.canActivate(createExecutionContext(request));

  assert.equal(result, true);
  assert.deepEqual(request.customer, customer);
  assert.deepEqual(repository.tokens, [VALID_TOKEN]);
});

test('rejects missing customer tokens without querying the repository', async (): Promise<void> => {
  const repository = new FakeCustomerTokenAuthRepository({ id: 'customer-1' });
  const guard = new CustomerTokenGuard(new AuthenticateCustomerTokenUseCase(repository));
  const request = createRequest({});

  await assertRejectsInvalidToken(() => guard.canActivate(createExecutionContext(request)));
  assert.deepEqual(repository.tokens, []);
});

test('rejects malformed customer tokens without querying the repository', async (): Promise<void> => {
  const repository = new FakeCustomerTokenAuthRepository({ id: 'customer-1' });
  const guard = new CustomerTokenGuard(new AuthenticateCustomerTokenUseCase(repository));
  const request = createRequest({ 'x-customer-token': 'not-a-token' });

  await assertRejectsInvalidToken(() => guard.canActivate(createExecutionContext(request)));
  assert.deepEqual(repository.tokens, []);
});

test('rejects valid tokens that do not resolve to an active customer', async (): Promise<void> => {
  const repository = new FakeCustomerTokenAuthRepository(null);
  const guard = new CustomerTokenGuard(new AuthenticateCustomerTokenUseCase(repository));
  const request = createRequest({ 'x-customer-token': VALID_TOKEN });

  await assertRejectsInvalidToken(() => guard.canActivate(createExecutionContext(request)));
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

type TestRequest = {
  customer?: AuthenticatedCustomerReadModel;
  readonly headers: Record<string, string | string[] | undefined>;
};

function createRequest(headers: TestRequest['headers']): TestRequest {
  return { headers };
}

function createExecutionContext(request: TestRequest): ExecutionContext {
  const context = {
    switchToHttp: (): {
      getNext: <TNext = unknown>() => TNext;
      getRequest: <TRequest = TestRequest>() => TRequest;
      getResponse: <TResponse = unknown>() => TResponse;
    } => ({
      getNext: <TNext = unknown>(): TNext => undefined as TNext,
      getRequest: <TRequest = TestRequest>(): TRequest => request as unknown as TRequest,
      getResponse: <TResponse = unknown>(): TResponse => ({}) as TResponse,
    }),
  };

  return context as unknown as ExecutionContext;
}

async function assertRejectsInvalidToken(action: () => Promise<boolean>): Promise<void> {
  await assert.rejects(
    action,
    (error: unknown): boolean => {
      assert.equal(error instanceof UnauthorizedException, true);
      assert.equal((error as UnauthorizedException).message, 'Token inválido');

      return true;
    },
  );
}
