export type AdminLoginReadModel = {
  readonly accessToken: string;
  readonly user: AdminLoginUserReadModel;
};

export type AdminLoginUserReadModel = {
  readonly email: string;
  readonly id: string;
  readonly name: string;
};
