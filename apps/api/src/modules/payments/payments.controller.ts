import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePixPaymentDto } from './dto/create-pix-payment.dto';
import { CreateCardPaymentDto } from './dto/create-card-payment.dto';
import { CreateDebitCardPaymentDto } from './dto/create-debit-card-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('pix')
  createPixPayment(@Body() dto: CreatePixPaymentDto) {
    return this.paymentsService.createPixPayment(dto);
  }

  @Post('credit-card')
  createCardPayment(@Body() dto: CreateCardPaymentDto) {
    return this.paymentsService.createCardPayment(dto);
  }

  @Post('3ds-session')
  create3dsSession() {
    return this.paymentsService.createPagBank3dsSession();
  }

  @Post('debit-card')
  createDebitCardPayment(@Body() dto: CreateDebitCardPaymentDto) {
    return this.paymentsService.createDebitCardPayment(dto);
  }

  @Get(':orderId/status')
  getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId);
  }
}
