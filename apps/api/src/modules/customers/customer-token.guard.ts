import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticateCustomerTokenUseCase } from './application/use-cases/authenticate-customer-token.use-case';
import { AuthenticatedCustomerRequest } from './authenticated-customer.request';

@Injectable()
export class CustomerTokenGuard implements CanActivate {
  public constructor(
    private readonly authenticateCustomerTokenUseCase: AuthenticateCustomerTokenUseCase,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedCustomerRequest>();
    const token = this.getTokenFromHeader(request.headers['x-customer-token']);

    if (!token) {
      throw new UnauthorizedException('Token inválido');
    }

    const customer = await this.authenticateCustomerTokenUseCase.execute({ token });

    if (!customer) {
      throw new UnauthorizedException('Token inválido');
    }

    request.customer = customer;

    return true;
  }

  private getTokenFromHeader(header: string | string[] | undefined): string | null {
    if (typeof header !== 'string') {
      return null;
    }

    return header;
  }
}
