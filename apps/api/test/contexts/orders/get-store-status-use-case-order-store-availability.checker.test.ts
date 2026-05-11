import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  GetStoreStatusCommand,
  GetStoreStatusResult,
} from '../../../src/modules/store/application/use-cases/get-store-status.use-case';
import { GetStoreStatusUseCaseOrderStoreAvailabilityChecker } from '../../../src/modules/orders/adapters/store/get-store-status-use-case-order-store-availability.checker';

test('checks immediate store availability through the store status use case', async (): Promise<void> => {
  const useCase = new FakeGetStoreStatusUseCase({ open: true });
  const checker = new GetStoreStatusUseCaseOrderStoreAvailabilityChecker(useCase);

  const result = await checker.check({ scheduledFor: null });

  assert.deepEqual(result, { open: true, reason: null });
  assert.deepEqual(useCase.commands, [{}]);
});

test('checks scheduled store availability while ignoring force-open mode', async (): Promise<void> => {
  const scheduledFor = new Date('2026-05-08T15:00:00.000Z');
  const useCase = new FakeGetStoreStatusUseCase({ open: false, reason: 'closed' });
  const checker = new GetStoreStatusUseCaseOrderStoreAvailabilityChecker(useCase);

  const result = await checker.check({ scheduledFor });

  assert.deepEqual(result, { open: false, reason: 'closed' });
  assert.deepEqual(useCase.commands, [{ at: scheduledFor, ignoreForceOpen: true }]);
});

class FakeGetStoreStatusUseCase {
  public readonly commands: GetStoreStatusCommand[] = [];

  public constructor(private readonly result: GetStoreStatusResult) {}

  public async execute(command: GetStoreStatusCommand = {}): Promise<GetStoreStatusResult> {
    this.commands.push(command);
    return this.result;
  }
}
