export const ADMIN_AUTH_REPOSITORY = Symbol('ADMIN_AUTH_REPOSITORY');

export type AdminAuthAccount = {
  readonly email: string;
  readonly id: string;
  readonly name: string;
  readonly passwordHash: string;
};

export interface AdminAuthRepository {
  findByEmail(email: string): Promise<AdminAuthAccount | null>;
}
