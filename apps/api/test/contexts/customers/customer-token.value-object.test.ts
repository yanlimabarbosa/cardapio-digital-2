import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerToken } from '../../../src/modules/customers/domain/customer-token.value-object';

const VALID_TOKEN = '00000000-0000-4000-8000-000000000001';

test('accepts UUID customer tokens without normalizing case', (): void => {
  const token = CustomerToken.parse(VALID_TOKEN.toUpperCase());

  assert.equal(token?.value, VALID_TOKEN.toUpperCase());
  assert.equal(token?.toString(), VALID_TOKEN.toUpperCase());
});

test('rejects malformed customer tokens', (): void => {
  assert.equal(CustomerToken.parse('not-a-token'), null);
});

test('compares customer token values exactly', (): void => {
  const token = parseRequired(VALID_TOKEN);
  const same = parseRequired(VALID_TOKEN);
  const different = parseRequired('00000000-0000-4000-8000-000000000002');

  assert.equal(token.equals(same), true);
  assert.equal(token.equals(different), false);
});

function parseRequired(value: string): CustomerToken {
  const token = CustomerToken.parse(value);

  if (!token) {
    throw new Error(`Expected valid customer token: ${value}`);
  }

  return token;
}
