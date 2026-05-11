import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminInvalidCredentialsError } from '../../../src/modules/admin/application/errors/admin-auth.errors';
import type {
  AdminAuthAccount,
  AdminAuthRepository,
} from '../../../src/modules/admin/application/ports/admin-auth.repository.port';
import type {
  AdminPasswordVerifier,
  VerifyAdminPasswordCommand,
} from '../../../src/modules/admin/application/ports/admin-password-verifier.port';
import type {
  AdminTokenIssuer,
  IssueAdminTokenCommand,
} from '../../../src/modules/admin/application/ports/admin-token-issuer.port';
import { LoginAdminUseCase } from '../../../src/modules/admin/application/use-cases/login-admin.use-case';

test('authenticates an admin and issues a token', async (): Promise<void> => {
  const repository = new FakeAdminAuthRepository(createAdminAccount());
  const passwords = new FakeAdminPasswordVerifier(true);
  const tokens = new FakeAdminTokenIssuer();
  const useCase = new LoginAdminUseCase(repository, passwords, tokens);

  const result = await useCase.execute({
    email: 'admin@example.com',
    password: 'secret',
  });

  assert.deepEqual(result, {
    accessToken: 'jwt-token',
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
    },
  });
  assert.deepEqual(repository.findByEmailCalls, ['admin@example.com']);
  assert.deepEqual(passwords.verifyCalls, [{ password: 'secret', passwordHash: 'hash' }]);
  assert.deepEqual(tokens.issueCalls, [{ adminId: 'admin-1', email: 'admin@example.com' }]);
});

test('rejects missing admin accounts without checking password or issuing tokens', async (): Promise<void> => {
  const repository = new FakeAdminAuthRepository(null);
  const passwords = new FakeAdminPasswordVerifier(true);
  const tokens = new FakeAdminTokenIssuer();
  const useCase = new LoginAdminUseCase(repository, passwords, tokens);

  await assert.rejects(
    () => useCase.execute({ email: 'missing@example.com', password: 'secret' }),
    AdminInvalidCredentialsError,
  );

  assert.deepEqual(repository.findByEmailCalls, ['missing@example.com']);
  assert.deepEqual(passwords.verifyCalls, []);
  assert.deepEqual(tokens.issueCalls, []);
});

test('rejects invalid admin passwords without issuing tokens', async (): Promise<void> => {
  const repository = new FakeAdminAuthRepository(createAdminAccount());
  const passwords = new FakeAdminPasswordVerifier(false);
  const tokens = new FakeAdminTokenIssuer();
  const useCase = new LoginAdminUseCase(repository, passwords, tokens);

  await assert.rejects(
    () => useCase.execute({ email: 'admin@example.com', password: 'wrong' }),
    AdminInvalidCredentialsError,
  );

  assert.deepEqual(repository.findByEmailCalls, ['admin@example.com']);
  assert.deepEqual(passwords.verifyCalls, [{ password: 'wrong', passwordHash: 'hash' }]);
  assert.deepEqual(tokens.issueCalls, []);
});

function createAdminAccount(): AdminAuthAccount {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    passwordHash: 'hash',
  };
}

class FakeAdminAuthRepository implements AdminAuthRepository {
  public readonly findByEmailCalls: string[] = [];

  public constructor(private readonly account: AdminAuthAccount | null) {}

  public async findByEmail(email: string): Promise<AdminAuthAccount | null> {
    this.findByEmailCalls.push(email);
    return this.account;
  }
}

class FakeAdminPasswordVerifier implements AdminPasswordVerifier {
  public readonly verifyCalls: VerifyAdminPasswordCommand[] = [];

  public constructor(private readonly validPassword: boolean) {}

  public async verify(command: VerifyAdminPasswordCommand): Promise<boolean> {
    this.verifyCalls.push(command);
    return this.validPassword;
  }
}

class FakeAdminTokenIssuer implements AdminTokenIssuer {
  public readonly issueCalls: IssueAdminTokenCommand[] = [];

  public issue(command: IssueAdminTokenCommand): string {
    this.issueCalls.push(command);
    return 'jwt-token';
  }
}
