export const ADMIN_TOKEN_ISSUER = Symbol('ADMIN_TOKEN_ISSUER');

export type IssueAdminTokenCommand = {
  readonly adminId: string;
  readonly email: string;
};

export interface AdminTokenIssuer {
  issue(command: IssueAdminTokenCommand): string;
}
