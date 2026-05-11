export const ADMIN_PASSWORD_VERIFIER = Symbol('ADMIN_PASSWORD_VERIFIER');

export type VerifyAdminPasswordCommand = {
  readonly password: string;
  readonly passwordHash: string;
};

export interface AdminPasswordVerifier {
  verify(command: VerifyAdminPasswordCommand): Promise<boolean>;
}
