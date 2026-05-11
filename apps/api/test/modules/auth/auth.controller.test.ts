import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { AdminInvalidCredentialsError } from '../../../src/modules/admin/application/errors/admin-auth.errors';
import {
  LoginAdminCommand,
  LoginAdminResult,
  LoginAdminUseCase,
} from '../../../src/modules/admin/application/use-cases/login-admin.use-case';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthenticatedAdminRequest } from '../../../src/modules/auth/authenticated-admin.request';
import {
  AuthProfileResponseDto,
  AuthUserResponseDto,
  LoginResponseDto,
} from '../../../src/modules/auth/dto/response/login-response.dto';

test('auth controller maps admin login results to response DTOs', async (): Promise<void> => {
  const harness = createHarness({
    accessToken: 'jwt-token',
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
    },
  });

  const result = await harness.controller.login({
    email: 'admin@example.com',
    password: 'secret',
  });

  assert.deepEqual(result, new LoginResponseDto('jwt-token', new AuthUserResponseDto('admin-1', 'admin@example.com', 'Admin')));
  assert.deepEqual(harness.useCase.executeCalls, [
    {
      email: 'admin@example.com',
      password: 'secret',
    },
  ]);
});

test('auth controller preserves invalid credential http behavior', async (): Promise<void> => {
  const harness = createHarness(new AdminInvalidCredentialsError());

  await assert.rejects(
    () => harness.controller.login({ email: 'admin@example.com', password: 'wrong' }),
    (error: unknown): boolean =>
      error instanceof UnauthorizedException && error.message === 'Credenciais inválidas',
  );
});

test('auth controller maps the authenticated admin profile', (): void => {
  const harness = createHarness(new AdminInvalidCredentialsError());
  const request: AuthenticatedAdminRequest = {
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
    },
  };

  const result = harness.controller.getProfile(request);

  assert.deepEqual(result, new AuthProfileResponseDto('admin-1', 'admin@example.com'));
});

function createHarness(result: LoginAdminResult | Error): {
  readonly controller: AuthController;
  readonly useCase: FakeLoginAdminUseCase;
} {
  const useCase = new FakeLoginAdminUseCase(result);
  return {
    controller: new AuthController(useCase as unknown as LoginAdminUseCase),
    useCase,
  };
}

class FakeLoginAdminUseCase {
  public readonly executeCalls: LoginAdminCommand[] = [];

  public constructor(private readonly result: LoginAdminResult | Error) {}

  public async execute(command: LoginAdminCommand): Promise<LoginAdminResult> {
    this.executeCalls.push(command);
    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }
}
