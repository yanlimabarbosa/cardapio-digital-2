import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  StoreSettingsModel,
  StoreSettingsRepository,
} from '../../../src/modules/store/application/ports/store-settings.repository.port';
import { GetStoreSettingsUseCase } from '../../../src/modules/store/application/use-cases/get-store-settings.use-case';
import { SetStoreModeUseCase } from '../../../src/modules/store/application/use-cases/set-store-mode.use-case';
import { ToggleStoreForceCloseUseCase } from '../../../src/modules/store/application/use-cases/toggle-store-force-close.use-case';
import { ToggleStoreForceOpenUseCase } from '../../../src/modules/store/application/use-cases/toggle-store-force-open.use-case';
import { UpdateStoreSettingsUseCase } from '../../../src/modules/store/application/use-cases/update-store-settings.use-case';
import { StoreMode } from '../../../src/modules/store/domain/store-mode.value-object';

type StoreSettingsCall =
  | {
    readonly method: 'get';
  }
  | {
    readonly method: 'save';
    readonly settings: StoreSettingsModel;
  };

test('reads store settings through the repository port', async (): Promise<void> => {
  const repository = new FakeStoreSettingsRepository();
  const useCase = new GetStoreSettingsUseCase(repository);

  const result = await useCase.execute();

  assert.deepEqual(result, repository.current);
  assert.deepEqual(repository.calls, [{ method: 'get' }]);
});

test('updates store settings through the repository port', async (): Promise<void> => {
  const repository = new FakeStoreSettingsRepository({
    forceClose: true,
    weeklySchedule: {
      1: [{ start: '09:00', end: '12:00' }],
    },
  });
  const useCase = new UpdateStoreSettingsUseCase(repository);

  const result = await useCase.execute({
    data: {
      forceOpen: true,
      pointsPerReal: 2.5,
      receiptFooter: 'Obrigado pela preferencia',
      weeklySchedule: null,
    },
  });

  assert.deepEqual(result, {
    ...createStoreSettings(),
    forceClose: false,
    forceOpen: true,
    pointsPerReal: '2.5',
    receiptFooter: 'Obrigado pela preferencia',
    weeklySchedule: {},
  });
  assert.deepEqual(repository.calls, [
    { method: 'get' },
    { method: 'save', settings: result },
  ]);
});

test('returns current store settings without saving when update data is empty', async (): Promise<void> => {
  const repository = new FakeStoreSettingsRepository();
  const useCase = new UpdateStoreSettingsUseCase(repository);

  const result = await useCase.execute({ data: {} });

  assert.deepEqual(result, repository.current);
  assert.deepEqual(repository.calls, [{ method: 'get' }]);
});

test('toggles force-close and clears force-open through store mode rules', async (): Promise<void> => {
  const repository = new FakeStoreSettingsRepository({ forceOpen: true });
  const useCase = new ToggleStoreForceCloseUseCase(repository);

  const result = await useCase.execute();

  assert.equal(result.forceClose, true);
  assert.equal(result.forceOpen, false);
  assert.deepEqual(repository.calls, [
    { method: 'get' },
    { method: 'save', settings: result },
  ]);
});

test('toggles force-open and clears force-close through store mode rules', async (): Promise<void> => {
  const repository = new FakeStoreSettingsRepository({ forceClose: true });
  const useCase = new ToggleStoreForceOpenUseCase(repository);

  const result = await useCase.execute();

  assert.equal(result.forceClose, false);
  assert.equal(result.forceOpen, true);
  assert.deepEqual(repository.calls, [
    { method: 'get' },
    { method: 'save', settings: result },
  ]);
});

test('sets store mode through the repository port', async (): Promise<void> => {
  const repository = new FakeStoreSettingsRepository({ forceClose: true });
  const useCase = new SetStoreModeUseCase(repository);

  const result = await useCase.execute({ forceOpen: true });

  assert.equal(result.forceClose, false);
  assert.equal(result.forceOpen, true);
  assert.deepEqual(repository.calls, [
    { method: 'get' },
    { method: 'save', settings: result },
  ]);
});

test('returns current store settings without saving when set-mode data is empty', async (): Promise<void> => {
  const repository = new FakeStoreSettingsRepository({ forceOpen: true });
  const useCase = new SetStoreModeUseCase(repository);

  const result = await useCase.execute({});

  assert.deepEqual(result, repository.current);
  assert.deepEqual(repository.calls, [{ method: 'get' }]);
});

test('store mode never exposes force-close and force-open at the same time', (): void => {
  const mode = StoreMode.fromFlags({ forceClose: true, forceOpen: true });

  assert.deepEqual(mode.toFlags(), {
    forceClose: true,
    forceOpen: false,
  });
});

test('admin mode updates preserve legacy field order when both flags are sent', (): void => {
  const mode = StoreMode.fromFlags({ forceClose: false, forceOpen: false }).applyAdminUpdate({
    forceClose: true,
    forceOpen: true,
  });

  assert.deepEqual(mode.toFlags(), {
    forceClose: false,
    forceOpen: true,
  });
});

class FakeStoreSettingsRepository implements StoreSettingsRepository {
  public readonly calls: StoreSettingsCall[] = [];
  private settings: StoreSettingsModel;

  public constructor(overrides: Partial<StoreSettingsModel> = {}) {
    this.settings = createStoreSettings(overrides);
  }

  public get current(): StoreSettingsModel {
    return this.settings;
  }

  public async get(): Promise<StoreSettingsModel> {
    this.calls.push({ method: 'get' });
    return this.settings;
  }

  public async save(settings: StoreSettingsModel): Promise<StoreSettingsModel> {
    this.settings = settings;
    this.calls.push({ method: 'save', settings });
    return this.settings;
  }
}

function createStoreSettings(overrides: Partial<StoreSettingsModel> = {}): StoreSettingsModel {
  return {
    id: 1,
    openingTime: '11:00',
    closingTime: '21:00',
    openDays: [0, 1, 2, 3, 4, 5, 6],
    weeklySchedule: null,
    forceClose: false,
    forceOpen: false,
    pointsPerReal: '0',
    ...overrides,
  };
}
