import { IsEnum } from 'class-validator';
import { OrderStatus } from '@cardapio/shared';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
