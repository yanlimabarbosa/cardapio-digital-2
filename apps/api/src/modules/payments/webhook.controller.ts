import { Body, Controller, ForbiddenException, Headers, HttpCode, Post, Req } from '@nestjs/common';
import {
  HandlePagBankWebhookResult,
  HandlePagBankWebhookUseCase,
  PaymentWebhookForbiddenError,
} from './application/use-cases/handle-pagbank-webhook.use-case';

@Controller('webhooks')
export class WebhookController {
  public constructor(private readonly handlePagBankWebhookUseCase: HandlePagBankWebhookUseCase) {}

  @Post('pagbank')
  @HttpCode(200)
  public async handlePagBank(
    @Body() body: unknown,
    @Req() req: unknown,
    @Headers('x-authenticity-token') xAuthenticityToken?: string,
    @Headers('x-product-id') xProductId?: string,
  ): Promise<HandlePagBankWebhookResult> {
    try {
      return await this.handlePagBankWebhookUseCase.execute({
        payload: body,
        rawBody: getRawBody(req),
        authenticityToken: xAuthenticityToken,
        productId: xProductId,
      });
    } catch (error: unknown) {
      if (error instanceof PaymentWebhookForbiddenError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }
}

function getRawBody(request: unknown): Buffer | undefined {
  if (!isRecord(request)) {
    return undefined;
  }

  return Buffer.isBuffer(request.rawBody) ? request.rawBody : undefined;
}

function isRecord(value: unknown): value is { rawBody?: unknown } {
  return typeof value === 'object' && value !== null;
}
