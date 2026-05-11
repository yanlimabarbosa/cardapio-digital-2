import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import type { CustomerPhone } from '../../../src/modules/customers/domain/customer-phone.value-object';
import type {
  CustomerIdentifyRepositoryResult,
  CustomerIdentityRepository,
} from '../../../src/modules/customers/application/ports/customer-identity.repository.port';
import { IdentifyCustomerUseCase } from '../../../src/modules/customers/application/use-cases/identify-customer.use-case';

const transactionContext: TransactionContext = { contextName: 'fake' };

test('routes missing customers to registration after normalizing the phone', async (): Promise<void> => {
  const repository = new FakeCustomerIdentityRepository({ status: 'missing' });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new IdentifyCustomerUseCase(repository, unitOfWork);

  const result = await useCase.execute({ phone: '(81) 9 9999-0000' });

  assert.deepEqual(result, {
    exists: false,
    action: 'register',
  });
  assert.equal(unitOfWork.runs, 1);
  assert.deepEqual(repository.calls, [
    {
      phone: '81999990000',
      context: transactionContext,
    },
  ]);
});

test('routes customers with passwords to login', async (): Promise<void> => {
  const repository = new FakeCustomerIdentityRepository({ status: 'password-required' });
  const useCase = new IdentifyCustomerUseCase(repository, new FakeUnitOfWork());

  const result = await useCase.execute({ phone: '81999990000' });

  assert.deepEqual(result, {
    exists: true,
    hasPassword: true,
    action: 'login',
  });
});

test('authenticates passwordless existing customers with the regenerated token', async (): Promise<void> => {
  const repository = new FakeCustomerIdentityRepository({
    status: 'authenticated',
    token: 'customer-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: false,
      loyaltyPoints: 30,
      isAdmin: false,
    },
  });
  const useCase = new IdentifyCustomerUseCase(repository, new FakeUnitOfWork());

  const result = await useCase.execute({ phone: '81999990000' });

  assert.deepEqual(result, {
    exists: true,
    hasPassword: false,
    action: 'authenticated',
    token: 'customer-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: false,
      loyaltyPoints: 30,
      isAdmin: false,
    },
  });
});

type IdentifyCall = {
  readonly context: TransactionContext;
  readonly phone: string;
};

class FakeCustomerIdentityRepository implements CustomerIdentityRepository {
  public readonly calls: IdentifyCall[] = [];

  public constructor(private readonly result: CustomerIdentifyRepositoryResult) {}

  public async identifyByPhone(
    phone: CustomerPhone,
    context: TransactionContext,
  ): Promise<CustomerIdentifyRepositoryResult> {
    this.calls.push({ phone: phone.value, context });

    return this.result;
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public runs = 0;

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runs += 1;

    return work(transactionContext);
  }
}
