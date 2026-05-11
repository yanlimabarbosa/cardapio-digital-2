import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { CreatePixPaymentDto } from './dto/request/create-pix-payment.dto';
import { CreateCardPaymentDto } from './dto/request/create-card-payment.dto';
import { CreateDebitCardPaymentDto } from './dto/request/create-debit-card-payment.dto';
import {
  CreatePixPaymentResult,
  CreatePixPaymentUseCase,
  PaymentOrderNotFoundError,
} from './application/use-cases/create-pix-payment.use-case';
import {
  CardPaymentInputError,
  CardPaymentOrderNotFoundError,
  CreateCardPaymentResult,
  CreateCardPaymentUseCase,
} from './application/use-cases/create-card-payment.use-case';
import {
  CreateDebitCardPaymentResult,
  CreateDebitCardPaymentUseCase,
  DebitCardPaymentInputError,
  DebitCardPaymentOrderNotFoundError,
} from './application/use-cases/create-debit-card-payment.use-case';
import {
  CreatePayment3dsSessionResult,
  CreatePayment3dsSessionUseCase,
} from './application/use-cases/create-payment-3ds-session.use-case';
import {
  GetPaymentStatusResult,
  GetPaymentStatusUseCase,
  PaymentStatusOrderNotFoundError,
} from './application/use-cases/get-payment-status.use-case';

@Controller('payments')
export class PaymentsController {
  public constructor(
    private readonly createPixPaymentUseCase: CreatePixPaymentUseCase,
    private readonly createCardPaymentUseCase: CreateCardPaymentUseCase,
    private readonly createPayment3dsSessionUseCase: CreatePayment3dsSessionUseCase,
    private readonly createDebitCardPaymentUseCase: CreateDebitCardPaymentUseCase,
    private readonly getPaymentStatusUseCase: GetPaymentStatusUseCase,
  ) {}

  @Post('pix')
  public async createPixPayment(@Body() dto: CreatePixPaymentDto): Promise<CreatePixPaymentResult> {
    try {
      return await this.createPixPaymentUseCase.execute(dto);
    } catch (error: unknown) {
      if (error instanceof PaymentOrderNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Post('credit-card')
  public async createCardPayment(@Body() dto: CreateCardPaymentDto): Promise<CreateCardPaymentResult> {
    try {
      return await this.createCardPaymentUseCase.execute(dto);
    } catch (error: unknown) {
      if (error instanceof CardPaymentOrderNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CardPaymentInputError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('3ds-session')
  public create3dsSession(): Promise<CreatePayment3dsSessionResult> {
    return this.createPayment3dsSessionUseCase.execute();
  }

  @Post('debit-card')
  public async createDebitCardPayment(@Body() dto: CreateDebitCardPaymentDto): Promise<CreateDebitCardPaymentResult> {
    try {
      return await this.createDebitCardPaymentUseCase.execute(dto);
    } catch (error: unknown) {
      if (error instanceof DebitCardPaymentOrderNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof DebitCardPaymentInputError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(':orderId/status')
  public async getPaymentStatus(@Param('orderId') orderId: string): Promise<GetPaymentStatusResult> {
    try {
      return await this.getPaymentStatusUseCase.execute({ orderId });
    } catch (error: unknown) {
      if (error instanceof PaymentStatusOrderNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
