import { AdminInvalidCredentialsError } from '../errors/admin-auth.errors';
import type { AdminAuthRepository } from '../ports/admin-auth.repository.port';
import type { AdminPasswordVerifier } from '../ports/admin-password-verifier.port';
import type { AdminTokenIssuer } from '../ports/admin-token-issuer.port';
import type { AdminLoginReadModel } from '../read-models/admin-login.read-model';

export type LoginAdminCommand = {
  readonly email: string;
  readonly password: string;
};

export type LoginAdminResult = AdminLoginReadModel;

export class LoginAdminUseCase {
  public constructor(
    private readonly admins: AdminAuthRepository,
    private readonly passwords: AdminPasswordVerifier,
    private readonly tokens: AdminTokenIssuer,
  ) {}

  public async execute(command: LoginAdminCommand): Promise<LoginAdminResult> {
    const admin = await this.admins.findByEmail(command.email);
    if (!admin) {
      throw new AdminInvalidCredentialsError();
    }

    const validPassword = await this.passwords.verify({
      password: command.password,
      passwordHash: admin.passwordHash,
    });
    if (!validPassword) {
      throw new AdminInvalidCredentialsError();
    }

    return {
      accessToken: this.tokens.issue({ adminId: admin.id, email: admin.email }),
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  }
}
