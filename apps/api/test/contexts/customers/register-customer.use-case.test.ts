import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { CustomerAlreadyExistsError } from '../../../src/modules/customers/application/errors/customer.errors';
import type {
  CustomerRegistrationData,
  CustomerRegistrationRepository,
  CustomerRegistrationRepositoryResult,
} from '../../../src/modules/customers/application/ports/customer-registration.repository.port';
import { RegisterCustomerUseCase } from '../../../src/modules/customers/application/use-cases/register-customer.use-case';

const transactionContext: TransactionContext = { contextName: 'fake' };

test('registers a customer inside a unit of work with a normalized phone', async (): Promise<void> => {
  const repository = new FakeCustomerRegistrationRepository({
    status: 'registered',
    token: 'customer-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 0,
      isAdmin: false,
    },
  });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new RegisterCustomerUseCase(repository, unitOfWork);

  const result = await useCase.execute({
    phone: '(81) 9 9999-0000',
    name: 'Yan',
    password: 'secret',
  });

  assert.deepEqual(result, {
    token: 'customer-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 0,
      isAdmin: false,
    },
  });
  assert.equal(unitOfWork.runs, 1);
  assert.deepEqual(repository.calls, [
    {
      data: {
        phone: '81999990000',
        name: 'Yan',
        password: 'secret',
      },
      context: transactionContext,
    },
  ]);
});

test('throws an application error when the phone already exists', async (): Promise<void> => {
  const repository = new FakeCustomerRegistrationRepository({ status: 'duplicate-phone' });
  const useCase = new RegisterCustomerUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () =>
      useCase.execute({
        phone: '81999990000',
        name: 'Yan',
        password: 'secret',
      }),
    CustomerAlreadyExistsError,
  );
});

type RegisterCall = {
  readonly context: TransactionContext;
  readonly data: {
    readonly name: string;
    readonly password: string;
    readonly phone: string;
  };
};

class FakeCustomerRegistrationRepository implements CustomerRegistrationRepository {
  public readonly calls: RegisterCall[] = [];

  public constructor(private readonly result: CustomerRegistrationRepositoryResult) {}

  public async register(
    data: CustomerRegistrationData,
    context: TransactionContext,
  ): Promise<CustomerRegistrationRepositoryResult> {
    this.calls.push({
      data: {
        phone: data.phone.value,
        name: data.name,
        password: data.password,
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
