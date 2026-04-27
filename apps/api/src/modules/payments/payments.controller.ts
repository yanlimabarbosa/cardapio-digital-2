import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePixPaymentDto } from './dto/create-pix-payment.dto';
import { CreateCardPaymentDto } from './dto/create-card-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('pix')
  createPixPayment(@Body() dto: CreatePixPaymentDto) {
    return this.paymentsService.createPixPayment(dto.orderId);
  }

  @Post('credit-card')
  createCardPayment(@Body() dto: CreateCardPaymentDto) {
    return this.paymentsService.createCardPayment(dto);
  }

  @Get(':orderId/status')
  getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId);
  }
}
