# PagBank Real Sandbox Webhook Test

This document describes how to test a real PagBank sandbox webhook for the Bem Comer checkout.

Current local coverage already proves:
- The Pix waiting screen redirects to the paid order when a PagBank-like webhook marks the order as paid.
- The backend validates `x-authenticity-token` with the raw request body.
- The backend maps PagBank order/charge webhook payloads to the payment queue.

What is still not proven locally:
- PagBank itself sending the webhook to our endpoint.
- The exact real headers/body sent by the sandbox account currently used by the restaurant.

Official references:
- Webhooks for Orders API: https://developer.pagbank.com.br/reference/webhooks
- Pix QR Code Orders API: https://developer.pagbank.com.br/reference/criar-pedido-pedido-com-qr-code
- PagBank sandbox simulator: https://developer.pagbank.com.br/reference/simulador

## Why Localhost Is Not Enough

PagBank must call our webhook from PagBank's servers. A local URL such as `http://localhost:3001/api/webhooks/pagbank` is only reachable from this machine, not from PagBank.

The API intentionally only sends `notification_urls` when `API_PUBLIC_URL` is not localhost:

```env
API_PUBLIC_URL=https://public-url.example.com
```

With a public URL, Pix order creation sends:

```text
notification_urls=["https://public-url.example.com/api/webhooks/pagbank"]
```

With localhost, the app omits `notification_urls`, so no real PagBank webhook can be delivered.

## Option A: Test On The Deployed Server In Sandbox

Use this when we can temporarily run the public site against PagBank sandbox.

Server env:

```env
PAGBANK_ENV=sandbox
PAGBANK_ACCESS_TOKEN=<sandbox token>
PAGBANK_WEBHOOK_TOKEN=<webhook authenticity token, if configured by PagBank>
API_PUBLIC_URL=https://cardapiobemcomer.com.br
NEXT_PUBLIC_PAGBANK_ENV=sandbox
NEXT_PUBLIC_PAGBANK_PUBLIC_KEY=<sandbox public key>
```

Rebuild after env changes because the frontend public key/environment are compiled into the Next.js build:

```bash
ssh cardapioweb
cd /opt/bem-comer
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml up -d api web
```

Create a Pix order with total less than or equal to R$ 100,00. According to the PagBank simulator, this should be marked as paid automatically in sandbox.

Expected result:
- The Pix page starts at `Aguardando pagamento`.
- PagBank sends a webhook to `https://cardapiobemcomer.com.br/api/webhooks/pagbank`.
- The backend updates the local order to:

```json
{
  "orderStatus": "paid",
  "paymentStatus": "approved"
}
```

- The customer page redirects to `/order/:id` and shows `Pago`.

## Option B: Test Locally With A Public Tunnel

Use this when we want to keep the app local but expose only the API webhook publicly.

Example with a tunnel provider:

```bash
cloudflared tunnel --url http://localhost:3001
```

or:

```bash
ngrok http 3001
```

Then set local env:

```env
PAGBANK_ENV=sandbox
PAGBANK_ACCESS_TOKEN=<sandbox token>
PAGBANK_WEBHOOK_TOKEN=<webhook authenticity token, if configured by PagBank>
API_PUBLIC_URL=https://your-public-tunnel-url
NEXT_PUBLIC_PAGBANK_ENV=sandbox
NEXT_PUBLIC_PAGBANK_PUBLIC_KEY=<sandbox public key>
```

Restart the API and web processes after changing env vars.

Run the checkout locally and create a Pix order. The PagBank order payload should include:

```text
notification_urls=["https://your-public-tunnel-url/api/webhooks/pagbank"]
```

## What To Capture As Evidence

For homologation/debugging, capture:
- The sanitized PagBank Create Order request/response.
- The webhook request headers, especially:
  - `x-authenticity-token`
  - `x-product-origin`
  - `x-product-id`
- The webhook body.
- The local order status before and after webhook processing.
- The customer screen after redirecting to `/order/:id`.

Do not publish raw tokens, CPF, card encryption payloads, Pix copy/paste payloads, or full QR Code base64 in tracked docs.

## Useful Checks

Check order status after creating Pix:

```bash
curl http://localhost:3001/api/payments/<local-order-id>/status
```

Check that the public webhook endpoint is reachable:

```bash
curl -i https://public-url.example.com/api/webhooks/pagbank
```

The endpoint only accepts `POST`, so a `404` or `405` on `GET` is not the important part. What matters is that DNS/TLS/proxy reaches the API host and does not timeout.

## Known Open Questions

- Confirm the exact PagBank authenticity token/header used by the restaurant account in sandbox and production.
- Confirm whether the account sends only JSON Order/Charge webhooks or also legacy post-transaction notifications such as `notificationCode=...&notificationType=transaction`.
- If legacy post-transaction notifications are used for refund/chargeback, add support and tests before relying on refund automation.

## Remaining PagBank Gaps

This section tracks the broader gaps that should be closed before considering the PagBank integration production/homologation complete.

### 1. Real PagBank Sandbox Webhook Delivery

Current status:
- Local mocked webhook flow is covered.
- The Pix waiting screen redirects to the paid order when the local API receives a PagBank-like `PAID` webhook.

Missing:
- Run a real sandbox Pix order with a public `notification_urls` endpoint.
- Confirm PagBank actually calls `/api/webhooks/pagbank`.
- Save sanitized evidence of the real webhook headers/body and resulting local order status.

Why it matters:
- Pix payment confirmation is asynchronous. QR Code generation alone does not prove payment confirmation works in production.

### 2. Legacy Post-Transaction Notification Format

Current status:
- The webhook handler supports JSON Order/Charge-like payloads.
- `PAID`, `DECLINED`, `CANCELED`, `CANCELLED`, and `REFUNDED` statuses are mapped.

Missing:
- Confirm whether this PagBank account sends legacy post-transaction payloads such as:

```text
notificationCode=...&notificationType=transaction
```

- If yes, implement and test that format.

Why it matters:
- PagBank documentation says some post-transaction events can use another format.
- This affects refund, chargeback, cancellation, and availability/reconciliation events.

### 3. Admin/Kitchen Visual Confirmation

Current status:
- Customer-facing Pix confirmation is visually tested: pending Pix -> webhook paid -> order page shows `Pago`.

Missing:
- Visual E2E assertion that a webhook-paid Pix order appears in admin/kitchen as paid.
- Optional rejected/refunded visual assertions if those states are intended to be managed by staff.

Why it matters:
- The restaurant operational flow depends on admin/kitchen seeing paid orders reliably, not only the customer page.

### 4. Refund/Chargeback UX

Current status:
- Backend can map `REFUNDED` to local `paymentStatus = refunded`.

Missing:
- Define what the app should show to admin/customer when a paid order is refunded.
- Add tests only after the desired UX is defined.

Why it matters:
- A backend status that is not clearly surfaced can create operational confusion.

### 5. Real Homologation Evidence

Current status:
- Local/dev evidence generation exists and redacts sensitive data.

Missing:
- Run the full sandbox flow with `PAGBANK_EVIDENCE_ENABLED=true`.
- Review and attach sanitized request/response logs for:
  - Pix QR Code order.
  - Credit card approved.
  - Credit card denied.
  - Debit card 3DS approved.
  - Debit card 3DS denied/challenge scenarios, if PagBank requests them.
  - Real webhook delivery.

Why it matters:
- PagBank homologation can ask for request/response evidence showing payloads match the documentation.

### 6. Pix Payload Assertions

Current status:
- E2E verifies QR Code text, base64 image, expiration, and UI rendering.

Missing:
- Assert in backend evidence/tests that Pix Create Order sends:
  - `qr_codes` with exactly one QR Code.
  - amount in cents.
  - expiration date.
  - customer name/email/tax ID.
  - `notification_urls` when `API_PUBLIC_URL` is public.
  - no card `charges` flow for Pix.

Why it matters:
- PagBank documents Pix QR Code orders through `qr_codes`, not the card charge flow.

### 7. Card Payload Assertions

Current status:
- Browser sends encrypted card data to the API.
- Plain card number/CVV are not sent from browser to our API.
- Approved and denied card UI behavior is covered.

Missing:
- Assert in backend evidence/tests that card Create Order sends:
  - `charges.payment_method.type = CREDIT_CARD` or `DEBIT_CARD`.
  - `charges.payment_method.capture = true`.
  - `charges.payment_method.card.encrypted`.
  - `charges.payment_method.card.store = false`.
  - holder name/tax ID.
  - amount in cents.
  - customer name/email/tax ID.
  - `authentication_method.type = THREEDS` for debit card.
  - `notification_urls` when `API_PUBLIC_URL` is public.

Why it matters:
- This proves the app is using transparent checkout with encrypted data and not leaking sensitive card fields.

### 8. 3DS Negative And Status Scenarios

Current status:
- The 24 documented 3DS card/amount scenarios are represented in E2E structure.
- One successful debit 3DS path is proven in the normal checkout flow.

Missing:
- Confirm all 3DS documented outcomes against PagBank sandbox when credentials/public URL are stable:
  - authenticated and paid.
  - authenticated and declined.
  - not authenticated and paid.
  - not authenticated and declined.
  - challenge and no-challenge paths.
  - `AUTH_NOT_SUPPORTED`.
  - `CHANGE_PAYMENT_METHOD`.
  - `REQUIRE_CHALLENGE`.

Why it matters:
- Debit card depends on 3DS. Sandbox amount/card combinations intentionally produce different backend responses.

### 9. 3DS SDK Rejection Detail Handling

Current status:
- Frontend shows a friendly Portuguese error when `authenticate3DS` fails.

Missing:
- Tests for rejected SDK promises with documented detail fields:
  - `detail.httpStatus`
  - `detail.traceId`
  - `detail.message`
  - `detail.errorMessages`

Why it matters:
- The user should see a safe, useful error, while support/debug logs keep enough information to diagnose the issue.

### 10. Anti-Abuse Controls

Current status:
- Card data is encrypted in the browser through PagBank SDK before reaching our API.
- Backend validates basic payer/card DTO fields.

Missing:
- Add rate limiting and/or reCAPTCHA around card payment attempts.
- Add monitoring for repeated denied card attempts.

Why it matters:
- PagBank recommends extra checkout protection to reduce card-testing/fraud abuse.
