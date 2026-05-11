import * as bcrypt from 'bcrypt';
import type {
  AdminPasswordVerifier,
  VerifyAdminPasswordCommand,
} from '../../application/ports/admin-password-verifier.port';

export type AdminPasswordCompare = (password: string, passwordHash: string) => Promise<boolean>;

export class BcryptAdminPasswordVerifier implements AdminPasswordVerifier {
  public constructor(
    private readonly comparePassword: AdminPasswordCompare = (password, passwordHash) =>
      bcrypt.compare(password, passwordHash),
  ) {}

  public verify(command: VerifyAdminPasswordCommand): Promise<boolean> {
    return this.comparePassword(command.password, command.passwordHash);
  }
}
