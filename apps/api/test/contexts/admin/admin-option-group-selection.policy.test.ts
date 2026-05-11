import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AdminOptionGroupSelectionPolicy,
  InvalidAdminOptionGroupSelectionError,
} from '../../../src/modules/admin/domain/admin-option-group-selection.policy';

test('resolves default option group selection bounds for create', (): void => {
  const result = AdminOptionGroupSelectionPolicy.for({}).resolveForCreate();

  assert.deepEqual(result, { minSelections: 0, maxSelections: 1 });
});

test('rejects create bounds when both supplied values are invalid', (): void => {
  assert.throws(
    () => AdminOptionGroupSelectionPolicy.for({ minSelections: 3, maxSelections: 2 }).resolveForCreate(),
    (error: unknown): boolean =>
      error instanceof InvalidAdminOptionGroupSelectionError &&
      error.message === 'minSelections cannot be greater than maxSelections',
  );
});

test('preserves legacy create behavior when only one bound is supplied', (): void => {
  const result = AdminOptionGroupSelectionPolicy.for({ minSelections: 2 }).resolveForCreate();

  assert.deepEqual(result, { minSelections: 2, maxSelections: 1 });
});

test('resolves effective option group selection bounds for update', (): void => {
  const result = AdminOptionGroupSelectionPolicy.for({
    minSelections: 1,
    maxSelections: 3,
  }).resolveForUpdate({ maxSelections: 2 });

  assert.deepEqual(result, { minSelections: 1, maxSelections: 2 });
});

test('rejects update bounds after applying partial changes', (): void => {
  assert.throws(
    () =>
      AdminOptionGroupSelectionPolicy.for({ minSelections: 1, maxSelections: 2 }).resolveForUpdate({
        minSelections: 3,
      }),
    (error: unknown): boolean =>
      error instanceof InvalidAdminOptionGroupSelectionError &&
      error.message === 'minSelections cannot be greater than maxSelections',
  );
});
