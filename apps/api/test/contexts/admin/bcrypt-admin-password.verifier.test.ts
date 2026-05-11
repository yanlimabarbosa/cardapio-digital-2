import assert from 'node:assert/strict';
import test from 'node:test';
import { BcryptAdminPasswordVerifier } from '../../../src/modules/admin/adapters/auth/bcrypt-admin-password.verifier';

test('verifies admin passwords through the configured compare function', async (): Promise<void> => {
  const calls: Array<{ readonly password: string; readonly passwordHash: string }> = [];
  const verifier = new BcryptAdminPasswordVerifier(async (password, passwordHash) => {
    calls.push({ password, passwordHash });
    return true;
  });

  const result = await verifier.verify({
    password: 'secret',
    passwordHash: 'hash',
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [{ password: 'secret', passwordHash: 'hash' }]);
});
