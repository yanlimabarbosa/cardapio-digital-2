import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Customer } from '../../entities';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class CustomerTokenGuard implements CanActivate {
  constructor(private readonly em: EntityManager) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-customer-token'];

    if (!token || !UUID_REGEX.test(token)) {
      throw new UnauthorizedException('Token inválido');
    }

    const customer = await this.em.findOne(Customer, { token, isActive: true });
    if (!customer) {
      throw new UnauthorizedException('Token inválido');
    }

    request.customer = customer;
    return true;
  }
}
