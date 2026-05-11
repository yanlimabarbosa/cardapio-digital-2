import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { UpdateOrderStatusDto } from './dto/request/update-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateOrderCommand,
  CreateOrderNotFoundError,
  CreateOrderResult,
  CreateOrderUseCase,
  CreateOrderValidationError,
} from './application/use-cases/create-order.use-case';
import {
  ChangeOrderStatusResult,
  ChangeOrderStatusUseCase,
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
} from './application/use-cases/change-order-status.use-case';
import {
  GetKitchenOrdersResult,
  GetKitchenOrdersUseCase,
} from './application/use-cases/get-kitchen-orders.use-case';
import {
  GetOrderDetailsResult,
  GetOrderDetailsUseCase,
} from './application/use-cases/get-order-details.use-case';

@Controller('orders')
export class OrdersController {
  public constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getKitchenOrdersUseCase: GetKitchenOrdersUseCase,
    private readonly getOrderDetailsUseCase: GetOrderDetailsUseCase,
    private readonly changeOrderStatusUseCase: ChangeOrderStatusUseCase,
  ) {}

  @Post()
  public create(
    @Body() dto: CreateOrderDto,
    @Headers('x-customer-token') customerToken?: string,
  ): Promise<CreateOrderResult> {
    return this.createOrder(this.toCreateOrderCommand(dto, customerToken));
  }

  @UseGuards(JwtAuthGuard)
  @Get('kitchen')
  public getKitchenOrders(): Promise<GetKitchenOrdersResult> {
    return this.getKitchenOrdersUseCase.execute();
  }

  @Get(':id')
  public getOrder(@Param('id') id: string): Promise<GetOrderDetailsResult> {
    return this.getOrderDetailsUseCase.execute({ id });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  public async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto): Promise<ChangeOrderStatusResult> {
    try {
      return await this.changeOrderStatusUseCase.execute({ id, status: dto.status });
    } catch (error: unknown) {
      if (error instanceof OrderNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof InvalidOrderStatusTransitionError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private async createOrder(command: CreateOrderCommand): Promise<CreateOrderResult> {
    try {
      return await this.createOrderUseCase.execute(command);
    } catch (error: unknown) {
      if (error instanceof CreateOrderNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof CreateOrderValidationError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private toCreateOrderCommand(dto: CreateOrderDto, customerToken?: string): CreateOrderCommand {
    return {
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      paymentMethod: dto.paymentMethod,
      deliveryType: dto.deliveryType,
      deliveryAddress: dto.deliveryAddress,
      deliveryAreaId: dto.deliveryAreaId,
      notes: dto.notes,
      couponCode: dto.couponCode,
      scheduledFor: dto.scheduledFor,
      items: dto.items,
      redeemedItems: dto.redeemedItems,
      customerToken,
    };
  }
}
