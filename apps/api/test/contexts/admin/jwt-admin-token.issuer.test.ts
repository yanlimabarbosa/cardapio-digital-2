import assert from 'node:assert/strict';
import test from 'node:test';
import { JwtService } from '@nestjs/jwt';
import { JwtAdminTokenIssuer } from '../../../src/modules/admin/adapters/auth/jwt-admin-token.issuer';

test('issues admin JWTs with the existing payload shape', (): void => {
  const jwtService = new FakeJwtService();
  const issuer = new JwtAdminTokenIssuer(jwtService as unknown as JwtService);

  const token = issuer.issue({ adminId: 'admin-1', email: 'admin@example.com' });

  assert.equal(token, 'signed-token');
  assert.deepEqual(jwtService.signCalls, [
    {
      sub: 'admin-1',
      email: 'admin@example.com',
    },
  ]);
});

class FakeJwtService {
  public readonly signCalls: Array<{ readonly email: string; readonly sub: string }> = [];

  public sign(payload: { readonly email: string; readonly sub: string }): string {
    this.signCalls.push(payload);
    return 'signed-token';
  }
}
