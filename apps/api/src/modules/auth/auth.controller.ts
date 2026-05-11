import { Body, Controller, Get, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AdminInvalidCredentialsError } from '../admin/application/errors/admin-auth.errors';
import {
  LoginAdminResult,
  LoginAdminUseCase,
} from '../admin/application/use-cases/login-admin.use-case';
import { AuthenticatedAdminRequest } from './authenticated-admin.request';
import { LoginDto } from './dto/request/login.dto';
import { AuthProfileResponseDto, AuthUserResponseDto, LoginResponseDto } from './dto/response/login-response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  public constructor(private readonly loginAdminUseCase: LoginAdminUseCase) {}

  @Post('login')
  public async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    try {
      const result = await this.loginAdminUseCase.execute({
        email: dto.email,
        password: dto.password,
      });

      return this.toLoginResponseDto(result);
    } catch (error: unknown) {
      if (error instanceof AdminInvalidCredentialsError) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  public getProfile(@Request() req: AuthenticatedAdminRequest): AuthProfileResponseDto {
    return new AuthProfileResponseDto(req.user.id, req.user.email);
  }

  private toLoginResponseDto(result: LoginAdminResult): LoginResponseDto {
    return new LoginResponseDto(
      result.accessToken,
      new AuthUserResponseDto(result.user.id, result.user.email, result.user.name),
    );
  }
}
