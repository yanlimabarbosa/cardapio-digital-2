import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import {
  CustomerLoyaltyAdjustmentRejectedError,
  CustomerNotFoundError,
} from '../../../src/modules/customers/application/errors/customer.errors';
import type {
  ApplyCustomerLoyaltyAdjustmentCommand,
  ApplyCustomerLoyaltyAdjustmentResult,
  CustomerLoyaltyAdjustmentRepository,
  CustomerLoyaltyAdjustmentTarget,
} from '../../../src/modules/customers/application/ports/customer-loyalty-adjustment.repository.port';
import { AdjustCustomerLoyaltyUseCase } from '../../../src/modules/customers/application/use-cases/adjust-customer-loyalty.use-case';

const transactionContext: TransactionContext = { contextName: 'fake' };

test('adjusts customer loyalty points inside a unit of work', async (): Promise<void> => {
  const repository = new FakeCustomerLoyaltyAdjustmentRepository({
    target: { id: 'customer-1', phone: '81999990000', balance: 30 },
    result: {
      status: 'adjusted',
      balance: 45,
      transaction: { id: 'transaction-1', points: 15, type: 'adjustment' },
    },
  });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new AdjustCustomerLoyaltyUseCase(repository, unitOfWork);

  const result = await useCase.execute({
    customerId: 'customer-1',
    points: 15,
    description: 'Bonus manual',
  });

  assert.deepEqual(result, {
    balance: 45,
    transaction: { id: 'transaction-1', points: 15, type: 'adjustment' },
  });
  assert.equal(unitOfWork.runs, 1);
  assert.deepEqual(repository.findTargetCalls, [
    {
      customerId: 'customer-1',
      context: transactionContext,
    },
  ]);
  assert.deepEqual(repository.applyAdjustmentCalls, [
    {
      command: {
        customerId: 'customer-1',
        customerPhone: '81999990000',
        points: 15,
        description: 'Bonus manual',
      },
      context: transactionContext,
    },
  ]);
});

test('uses the domain default adjustment description when none is provided', async (): Promise<void> => {
  const repository = new FakeCustomerLoyaltyAdjustmentRepository({
    target: { id: 'customer-1', phone: '81999990000', balance: 30 },
    result: {
      status: 'adjusted',
      balance: 20,
      transaction: { id: 'transaction-1', points: -10, type: 'adjustment' },
    },
  });
  const useCase = new AdjustCustomerLoyaltyUseCase(repository, new FakeUnitOfWork());

  await useCase.execute({
    customerId: 'customer-1',
    points: -10,
  });

  assert.equal(repository.applyAdjustmentCalls[0]?.command.description, 'Ajuste manual (debito)');
});

test('throws an application error when the customer is missing', async (): Promise<void> => {
  const repository = new FakeCustomerLoyaltyAdjustmentRepository({
    target: null,
    result: { status: 'insufficient-balance' },
  });
  const useCase = new AdjustCustomerLoyaltyUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () =>
      useCase.execute({
        customerId: 'missing-customer',
        points: 10,
      }),
    CustomerNotFoundError,
  );
  assert.deepEqual(repository.applyAdjustmentCalls, []);
});

test('rejects insufficient balances before applying the adjustment', async (): Promise<void> => {
  const repository = new FakeCustomerLoyaltyAdjustmentRepository({
    target: { id: 'customer-1', phone: '81999990000', balance: 5 },
    result: { status: 'insufficient-balance' },
  });
  const useCase = new AdjustCustomerLoyaltyUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () =>
      useCase.execute({
        customerId: 'customer-1',
        points: -6,
      }),
    CustomerLoyaltyAdjustmentRejectedError,
  );
  assert.deepEqual(repository.applyAdjustmentCalls, []);
});

test('rejects when the SQL balance guard reports insufficient balance', async (): Promise<void> => {
  const repository = new FakeCustomerLoyaltyAdjustmentRepository({
    target: { id: 'customer-1', phone: '81999990000', balance: 30 },
    result: { status: 'insufficient-balance' },
  });
  const useCase = new AdjustCustomerLoyaltyUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () =>
      useCase.execute({
        customerId: 'customer-1',
        points: -20,
      }),
    CustomerLoyaltyAdjustmentRejectedError,
  );
  assert.equal(repository.applyAdjustmentCalls.length, 1);
});

type LoyaltyAdjustmentRepositoryOptions = {
  readonly result: ApplyCustomerLoyaltyAdjustmentResult;
  readonly target: CustomerLoyaltyAdjustmentTarget | null;
};

type FindTargetCall = {
  readonly context: TransactionContext;
  readonly customerId: string;
};

type ApplyAdjustmentCall = {
  readonly command: ApplyCustomerLoyaltyAdjustmentCommand;
  readonly context: TransactionContext;
};

class FakeCustomerLoyaltyAdjustmentRepository implements CustomerLoyaltyAdjustmentRepository {
  public readonly applyAdjustmentCalls: ApplyAdjustmentCall[] = [];
  public readonly findTargetCalls: FindTargetCall[] = [];

  public constructor(private readonly options: LoyaltyAdjustmentRepositoryOptions) {}

  public async findTarget(
    customerId: string,
    context: TransactionContext,
  ): Promise<CustomerLoyaltyAdjustmentTarget | null> {
    this.findTargetCalls.push({ customerId, context });

    return this.options.target;
  }

  public async applyAdjustment(
    command: ApplyCustomerLoyaltyAdjustmentCommand,
    context: TransactionContext,
  ): Promise<ApplyCustomerLoyaltyAdjustmentResult> {
    this.applyAdjustmentCalls.push({ command, context });

    return this.options.result;
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public runs: number = 0;

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runs += 1;

    return work(transactionContext);
  }
}
