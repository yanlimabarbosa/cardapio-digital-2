import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, Headers } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @Headers('x-customer-token') customerToken?: string,
  ) {
    return this.ordersService.create(dto, customerToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('kitchen')
  getKitchenOrders() {
    return this.ordersService.getKitchenOrders();
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrderResponse(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
