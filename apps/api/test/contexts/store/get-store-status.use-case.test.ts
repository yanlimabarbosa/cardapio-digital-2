import assert from 'node:assert/strict';
import test from 'node:test';
import { GetStoreStatusUseCase } from '../../../src/modules/store/application/use-cases/get-store-status.use-case';
import type {
  StoreSettingsModel,
  StoreSettingsRepository,
} from '../../../src/modules/store/application/ports/store-settings.repository.port';
import type { Clock } from '../../../src/shared/application/clock/clock.port';

test('uses the clock for immediate store status lookup', async (): Promise<void> => {
  const harness = createHarness({
    settings: createStoreSettings({ forceOpen: true, weeklySchedule: {} }),
    now: new Date('2026-05-06T09:00:00-03:00'),
  });

  const result = await harness.useCase.execute();

  assert.equal(result.open, true);
  assert.equal(harness.clock.calls, 1);
  assert.equal(harness.repository.getCalls, 1);
});

test('ignores force-open for scheduled store status lookup', async (): Promise<void> => {
  const harness = createHarness({
    settings: createStoreSettings({ forceOpen: true, weeklySchedule: {} }),
  });

  const result = await harness.useCase.execute({
    at: new Date('2026-05-06T09:00:00-03:00'),
    ignoreForceOpen: true,
  });

  assert.equal(result.open, false);
  assert.equal(result.reason, 'Fechado hoje');
  assert.equal(harness.clock.calls, 0);
  assert.equal(harness.repository.getCalls, 1);
});

test('evaluates availability from legacy schedule fields when weekly schedule is empty', async (): Promise<void> => {
  const harness = createHarness({
    settings: createStoreSettings({
      weeklySchedule: null,
      openDays: [3],
      openingTime: '11:00',
      closingTime: '21:00',
    }),
  });

  const result = await harness.useCase.execute({
    at: new Date('2026-05-06T12:00:00-03:00'),
  });

  assert.equal(result.open, true);
  assert.equal(result.opensAt, '11:00');
  assert.equal(result.closesAt, '21:00');
  assert.deepEqual(result.openDays, [3]);
});

function createHarness(input: {
  now?: Date;
  settings: StoreSettingsModel;
}): {
  clock: FakeClock;
  repository: FakeStoreSettingsRepository;
  useCase: GetStoreStatusUseCase;
} {
  const repository = new FakeStoreSettingsRepository(input.settings);
  const clock = new FakeClock(input.now ?? new Date('2026-05-06T12:00:00-03:00'));

  return {
    clock,
    repository,
    useCase: new GetStoreStatusUseCase(repository, clock),
  };
}

function createStoreSettings(overrides: Partial<StoreSettingsModel> = {}): StoreSettingsModel {
  return {
    id: 1,
    openingTime: '11:00',
    closingTime: '21:00',
    openDays: [0, 1, 2, 3, 4, 5, 6],
    weeklySchedule: {
      0: [{ start: '11:00', end: '21:00' }],
      1: [{ start: '11:00', end: '21:00' }],
      2: [{ start: '11:00', end: '21:00' }],
      3: [{ start: '11:00', end: '21:00' }],
      4: [{ start: '11:00', end: '21:00' }],
      5: [{ start: '11:00', end: '21:00' }],
      6: [{ start: '11:00', end: '21:00' }],
    },
    forceClose: false,
    forceOpen: false,
    metaPixelEnabled: false,
    metaPixelIds: [],
    pointsPerReal: '0',
    ...overrides,
  };
}

class FakeClock implements Clock {
  public calls = 0;

  public constructor(private readonly currentDate: Date) {}

  public now(): Date {
    this.calls += 1;
    return this.currentDate;
  }
}

class FakeStoreSettingsRepository implements StoreSettingsRepository {
  public getCalls = 0;
  public savedSettings: StoreSettingsModel | null = null;

  public constructor(private readonly settings: StoreSettingsModel) {}

  public async get(): Promise<StoreSettingsModel> {
    this.getCalls += 1;
    return this.settings;
  }

  public async save(settings: StoreSettingsModel): Promise<StoreSettingsModel> {
    this.savedSettings = settings;
    return settings;
  }
}
