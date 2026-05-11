import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { AdminUser } from '../../entities';
import { BcryptAdminPasswordVerifier } from '../admin/adapters/auth/bcrypt-admin-password.verifier';
import { JwtAdminTokenIssuer } from '../admin/adapters/auth/jwt-admin-token.issuer';
import { MikroOrmAdminAuthRepository } from '../admin/adapters/persistence/mikro-orm-admin-auth.repository';
import {
  ADMIN_AUTH_REPOSITORY,
  AdminAuthRepository,
} from '../admin/application/ports/admin-auth.repository.port';
import {
  ADMIN_PASSWORD_VERIFIER,
  AdminPasswordVerifier,
} from '../admin/application/ports/admin-password-verifier.port';
import {
  ADMIN_TOKEN_ISSUER,
  AdminTokenIssuer,
} from '../admin/application/ports/admin-token-issuer.port';
import { LoginAdminUseCase } from '../admin/application/use-cases/login-admin.use-case';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    MikroOrmModule.forFeature([AdminUser]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: MikroOrmAdminAuthRepository,
      useFactory: (em: EntityManager): MikroOrmAdminAuthRepository =>
        new MikroOrmAdminAuthRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ADMIN_AUTH_REPOSITORY,
      useExisting: MikroOrmAdminAuthRepository,
    },
    {
      provide: ADMIN_PASSWORD_VERIFIER,
      useFactory: (): BcryptAdminPasswordVerifier => new BcryptAdminPasswordVerifier(),
    },
    {
      provide: ADMIN_TOKEN_ISSUER,
      useFactory: (jwtService: JwtService): JwtAdminTokenIssuer => new JwtAdminTokenIssuer(jwtService),
      inject: [JwtService],
    },
    {
      provide: LoginAdminUseCase,
      useFactory: (
        admins: AdminAuthRepository,
        passwords: AdminPasswordVerifier,
        tokens: AdminTokenIssuer,
      ): LoginAdminUseCase => new LoginAdminUseCase(admins, passwords, tokens),
      inject: [ADMIN_AUTH_REPOSITORY, ADMIN_PASSWORD_VERIFIER, ADMIN_TOKEN_ISSUER],
    },
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
