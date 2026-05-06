import { Body, Controller, ForbiddenException, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PAYMENT_QUEUE } from './payment.constants';
import { buildPagBankWebhookJob, enqueuePagBankWebhookJob, verifyPagBankWebhookSignature } from './pagbank-webhook';

@Controller('webhooks')
export class WebhookController {
  private readonly pagBankWebhookToken: string;

  constructor(
    @InjectQueue(PAYMENT_QUEUE) private paymentQueue: Queue,
    private configService: ConfigService,
  ) {
    this.pagBankWebhookToken = this.configService.get<string>('PAGBANK_WEBHOOK_TOKEN', '');
  }

  @Post('pagbank')
  @HttpCode(200)
  async handlePagBank(
    @Body() body: any,
    @Req() req: any,
    @Headers('x-authenticity-token') xAuthenticityToken: string,
    @Headers('x-product-id') xProductId: string,
  ) {
    if (this.pagBankWebhookToken) {
      if (!verifyPagBankWebhookSignature(this.pagBankWebhookToken, xAuthenticityToken, req.rawBody)) {
        throw new ForbiddenException('Invalid PagBank webhook signature');
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('PagBank webhook token not configured');
    }

    const paymentJob = buildPagBankWebhookJob(body, xProductId);

    if (paymentJob) {
      await enqueuePagBankWebhookJob(this.paymentQueue, paymentJob);
    }

    return { received: true };
  }
}
