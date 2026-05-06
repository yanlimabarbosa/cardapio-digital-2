import { createHash, timingSafeEqual } from 'crypto';
import type { Queue } from 'bullmq';

export type PagBankWebhookStatus = 'approved' | 'pending' | 'rejected' | 'refunded';

export type PagBankWebhookJob = {
  paymentId: string;
  referenceId?: string;
  status?: PagBankWebhookStatus;
  receivedAt: string;
};

export function verifyPagBankWebhookSignature(
  token: string,
  xAuthenticityToken: string | undefined,
  rawBody: Buffer | undefined,
): boolean {
  if (!token || !xAuthenticityToken || !rawBody) return false;

  const payload = rawBody.toString('utf8');
  const expected = createHash('sha256')
    .update(`${token}-${payload}`)
    .digest('hex');

  return safeCompare(expected, xAuthenticityToken);
}

export function buildPagBankWebhookJob(
  body: any,
  xProductId: string | undefined,
  receivedAt = new Date().toISOString(),
): PagBankWebhookJob | null {
  const paymentId = body?.id || xProductId;
  const referenceId = normalizePagBankReferenceId(body?.reference_id);
  const status = mapPagBankStatus(body?.status);

  if (!paymentId) return null;
  if (String(paymentId).startsWith('CHAR_') && !referenceId) return null;

  return {
    paymentId: String(paymentId),
    referenceId,
    status,
    receivedAt,
  };
}

export async function enqueuePagBankWebhookJob(
  paymentQueue: Pick<Queue, 'add'>,
  paymentJob: PagBankWebhookJob,
) {
  return paymentQueue.add(
    'process-payment',
    paymentJob,
    {
      jobId: `pagbank-payment-${paymentJob.paymentId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  );
}

export function normalizePagBankReferenceId(referenceId: string | undefined) {
  if (!referenceId) return undefined;
  return referenceId.startsWith('card-') ? referenceId.slice(5) : referenceId;
}

export function mapPagBankStatus(status: string | undefined): PagBankWebhookStatus | undefined {
  const normalized = status?.toUpperCase();
  if (normalized === 'PAID') return 'approved';
  if (normalized === 'DECLINED' || normalized === 'CANCELED' || normalized === 'CANCELLED') return 'rejected';
  if (normalized === 'REFUNDED') return 'refunded';
  if (normalized) return 'pending';
  return undefined;
}

function safeCompare(expected: string, received: string): boolean {
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
