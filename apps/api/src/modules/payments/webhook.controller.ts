import { createHmac } from 'crypto';
import { Controller, Post, Body, Query, Headers, HttpCode, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PAYMENT_QUEUE } from './payment.constants';

@Controller('webhooks')
export class WebhookController {
  private readonly webhookSecret: string;

  constructor(
    @InjectQueue(PAYMENT_QUEUE) private paymentQueue: Queue,
    private configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('MP_WEBHOOK_SECRET', '');
  }

  @Post('mercadopago')
  @HttpCode(200)
  async handleMercadoPago(
    @Body() body: any,
    @Query() query: any,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
  ) {
    // Validate signature — always enforce in production
    if (this.webhookSecret) {
      if (!this.verifySignature(xSignature, xRequestId, query?.['data.id'] || body?.data?.id)) {
        throw new ForbiddenException('Invalid webhook signature');
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Webhook secret not configured');
    }

    const paymentId = body?.data?.id || query?.id;
    const topic = body?.type || query?.topic;

    if (topic === 'payment' && paymentId) {
      await this.paymentQueue.add(
        'process-payment',
        {
          paymentId: String(paymentId),
          receivedAt: new Date().toISOString(),
        },
        {
          jobId: `mp-payment-${paymentId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
    }

    return { received: true };
  }

  private verifySignature(
    xSignature: string | undefined,
    xRequestId: string | undefined,
    dataId: string | undefined,
  ): boolean {
    if (!xSignature || !xRequestId) return false;

    // Parse x-signature header: "ts=xxx,v1=xxx"
    const parts: Record<string, string> = {};
    for (const part of xSignature.split(',')) {
      const [key, value] = part.split('=', 2);
      if (key && value) parts[key.trim()] = value.trim();
    }

    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    // Build the manifest string
    let manifest = `id:${dataId || ''};request-id:${xRequestId};ts:${ts};`;

    // Generate HMAC
    const hmac = createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');

    return hmac === v1;
  }
}
