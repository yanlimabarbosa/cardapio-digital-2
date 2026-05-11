import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import {
  CustomerInvalidCredentialsError,
  CustomerInvalidPasswordError,
} from '../../../src/modules/customers/application/errors/customer.errors';
import type {
  CustomerLoginCredentials,
  CustomerLoginRepository,
  CustomerLoginRepositoryResult,
} from '../../../src/modules/customers/application/ports/customer-login.repository.port';
import { LoginCustomerUseCase } from '../../../src/modules/customers/application/use-cases/login-customer.use-case';

const transactionContext: TransactionContext = { contextName: 'fake' };

test('authenticates a customer inside a unit of work with a normalized phone', async (): Promise<void> => {
  const repository = new FakeCustomerLoginRepository({
    status: 'authenticated',
    token: 'customer-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 30,
      isAdmin: true,
    },
  });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new LoginCustomerUseCase(repository, unitOfWork);

  const result = await useCase.execute({
    phone: '(81) 9 9999-0000',
    password: 'secret',
  });

  assert.deepEqual(result, {
    token: 'customer-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 30,
      isAdmin: true,
    },
  });
  assert.equal(unitOfWork.runs, 1);
  assert.deepEqual(repository.calls, [
    {
      credentials: {
        phone: '81999990000',
        password: 'secret',
      },
      context: transactionContext,
    },
  ]);
});

test('throws an application error for missing customers or customers without passwords', async (): Promise<void> => {
  const repository = new FakeCustomerLoginRepository({ status: 'invalid-credentials' });
  const useCase = new LoginCustomerUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () =>
      useCase.execute({
        phone: '81999990000',
        password: 'secret',
      }),
    CustomerInvalidCredentialsError,
  );
});

test('throws an application error for invalid passwords', async (): Promise<void> => {
  const repository = new FakeCustomerLoginRepository({ status: 'invalid-password' });
  const useCase = new LoginCustomerUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () =>
      useCase.execute({
        phone: '81999990000',
        password: 'wrong',
      }),
    CustomerInvalidPasswordError,
  );
});

type LoginCall = {
  readonly context: TransactionContext;
  readonly credentials: {
    readonly password: string;
    readonly phone: string;
  };
};

class FakeCustomerLoginRepository implements CustomerLoginRepository {
  public readonly calls: LoginCall[] = [];

  public constructor(private readonly result: CustomerLoginRepositoryResult) {}

  public async login(
    credentials: CustomerLoginCredentials,
    context: TransactionContext,
  ): Promise<CustomerLoginRepositoryResult> {
    this.calls.push({
      credentials: {
        phone: credentials.phone.value,
        password: credentials.password,
      },
      context,
    });

    return this.result;
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public runs: number = 0;

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runs += 1;

    return work(transactionContext);
  }
}
