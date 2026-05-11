import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import {
  CustomerNotFoundError,
  CustomerPasswordAlreadySetError,
} from '../../../src/modules/customers/application/errors/customer.errors';
import type {
  CustomerPasswordRepository,
  CustomerSetPasswordData,
  CustomerSetPasswordRepositoryResult,
} from '../../../src/modules/customers/application/ports/customer-password.repository.port';
import { SetCustomerPasswordUseCase } from '../../../src/modules/customers/application/use-cases/set-customer-password.use-case';

const transactionContext: TransactionContext = { contextName: 'fake' };

test('sets a customer password inside a unit of work', async (): Promise<void> => {
  const repository = new FakeCustomerPasswordRepository({
    status: 'updated',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 30,
      isAdmin: false,
    },
  });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new SetCustomerPasswordUseCase(repository, unitOfWork);

  const result = await useCase.execute({
    customerId: 'customer-1',
    password: 'secret123',
  });

  assert.deepEqual(result, {
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 30,
      isAdmin: false,
    },
  });
  assert.equal(unitOfWork.runs, 1);
  assert.deepEqual(repository.calls, [
    {
      data: {
        customerId: 'customer-1',
        password: 'secret123',
      },
      context: transactionContext,
    },
  ]);
});

test('throws an application error when the customer is missing', async (): Promise<void> => {
  const repository = new FakeCustomerPasswordRepository({ status: 'not-found' });
  const useCase = new SetCustomerPasswordUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () =>
      useCase.execute({
        customerId: 'missing-customer',
        password: 'secret123',
      }),
    CustomerNotFoundError,
  );
});

test('throws an application error when the customer already has a password', async (): Promise<void> => {
  const repository = new FakeCustomerPasswordRepository({ status: 'already-set' });
  const useCase = new SetCustomerPasswordUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () =>
      useCase.execute({
        customerId: 'customer-1',
        password: 'secret123',
      }),
    CustomerPasswordAlreadySetError,
  );
});

type SetPasswordCall = {
  readonly context: TransactionContext;
  readonly data: CustomerSetPasswordData;
};

class FakeCustomerPasswordRepository implements CustomerPasswordRepository {
  public readonly calls: SetPasswordCall[] = [];

  public constructor(private readonly result: CustomerSetPasswordRepositoryResult) {}

  public async setPassword(
    data: CustomerSetPasswordData,
    context: TransactionContext,
  ): Promise<CustomerSetPasswordRepositoryResult> {
    this.calls.push({ data, context });

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
