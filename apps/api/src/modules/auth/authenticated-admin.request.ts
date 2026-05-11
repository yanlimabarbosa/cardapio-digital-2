export type AuthenticatedAdminRequest = {
  readonly user: AuthenticatedAdminUser;
};

export type AuthenticatedAdminUser = {
  readonly email: string;
  readonly id: string;
};
