# PagBank Missing Coverage

This document lists the remaining gaps to make the Bem Comer PagBank integration closer to homologation-grade evidence.

Scope currently implemented:
- Pix through PagBank Create Order with QR Code.
- Credit card transparent checkout through PagBank SDK `encryptCard` and Create Order.
- Debit card through PagBank SDK `encryptCard`, PagBank 3DS authentication, and Create Order.

Out of scope unless the restaurant requests it:
- PCI customer raw-card server flow.
- Card brand token or PagBank token flows.
- Recurrence.
- Boleto.
- Payment split.
- Pay with PagBank deeplink/QR.
- Google Pay / Apple Pay.

Official references:
- Card order: https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-cartao
- Pix QR Code order: https://developer.pagbank.com.br/reference/criar-pedido-pedido-com-qr-code
- PagBank 3DS: https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-3ds-validacao-pagbank
- Real sandbox webhook test plan: ./pagbank-real-sandbox-webhook.md

## 1. Raw API To PagBank Evidence

Current status:
- Implemented for local/dev/test runs.
- Backend writes sanitized PagBank request/response exchanges to `test-results/pagbank-homologation/pagbank-backend-exchanges.jsonl`.
- Playwright evidence files include `backendPagBankExchanges`.
- Verified locally on 2026-05-05 with `pnpm test:e2e`: 8 passed.
- The generated evidence redacts bearer tokens, encrypted cards, PagBank 3DS session/auth IDs, Pix copy/paste payloads, QR Code base64, CPF/tax IDs, and phone-like numbers.

What is missing:
- For production homologation runs, enable evidence explicitly with `PAGBANK_EVIDENCE_ENABLED=true` and configure `PAGBANK_EVIDENCE_DIR` or `PAGBANK_EVIDENCE_FILE`.
- Review each evidence file before sending it to PagBank.

Why it matters:
- PagBank homologation may ask for request/response logs proving the payloads match their API specification.

## 2. 3DS Negative And Status Scenarios

Current status:
- One successful debit 3DS sandbox flow is covered.

What is missing:
- Tests for documented 3DS outcomes:
  - `AUTH_NOT_SUPPORTED`
  - `CHANGE_PAYMENT_METHOD`
  - `REQUIRE_CHALLENGE`
  - authenticated and declined
  - not authenticated and paid
  - not authenticated and declined

Why it matters:
- PagBank documents a sandbox test matrix with specific card numbers and amounts for these outcomes.
- Homologation may expect evidence that the integration handles more than one approved 3DS path.

## 3. 3DS SDK Rejection Handling

Current status:
- The app handles `authenticate3DS` failures by showing a frontend error message.

What is missing:
- Tests for rejected `authenticate3DS` promises with `detail` fields:
  - `detail.httpStatus`
  - `detail.traceId`
  - `detail.message`
  - `detail.errorMessages`

Why it matters:
- PagBank explicitly documents these fields for troubleshooting and validation errors.
- We should prove the customer sees a useful message and the logs retain enough detail for support.

## 4. Webhook And Payment Confirmation

Current status:
- Pix test proves QR Code generation.
- Card tests prove immediate approved/rejected responses.
- Webhook controller exists.
- Mocked webhook tests cover:
  - `x-authenticity-token` SHA-256 validation using the raw request body.
  - Orders API webhook payload mapping to a payment queue job.
  - Charge webhook `PAID`/`DECLINED`/`CANCELED`/`REFUNDED` status mapping.
  - Ignoring charge webhooks that cannot be mapped to a local order.
  - The BullMQ job name/options used by the controller.
- Frontend Pix webhook test covers:
  - User reaches the Pix QR Code waiting screen.
  - A mocked PagBank `PAID` webhook updates the real local order.
  - The checkout redirects to `/order/:id`.
  - The order page shows `Pago`.

What is missing:
- A real PagBank sandbox or production webhook delivery to the deployed URL.
- Optional admin/kitchen visual assertions for webhook-driven paid/rejected/refunded state.

Why it matters:
- Pix is asynchronous; generating the QR Code is not the same as confirming payment.
- Production reliability depends on webhook/status synchronization.

How to test later:
- Follow `docs/pagbank-real-sandbox-webhook.md`.
- Use either a deployed sandbox configuration or a public tunnel because PagBank cannot call localhost.
- For Pix sandbox, use an order total up to R$ 100,00 so the PagBank simulator marks it as paid automatically.

## 5. Pix Payload Assertions

Current status:
- Tests verify QR Code text, base64 image, expiration, and UI rendering.

What is missing:
- Backend evidence/assertions that the PagBank payload contains:
  - no `charges` object for Pix
  - exactly one `qr_codes` entry
  - amount in cents
  - expiration date
  - customer name/email/tax ID
  - optional shipping address when delivery is used
  - production notification URL when deployed

Why it matters:
- PagBank documentation states QR Code orders do not use `charges`, and QR details live under `qr_codes`.

## 6. Credit Card Payload Assertions

Current status:
- Tests verify the browser sends encrypted card data to our API.
- Tests verify approved and denied credit card UI behavior.
- Tests verify plaintext card number/CVV are not sent from browser to our API.

What is missing:
- Backend evidence/assertions that the PagBank payload contains:
  - `charges.payment_method.type = CREDIT_CARD`
  - `charges.payment_method.capture = true`
  - `charges.payment_method.card.encrypted`
  - `charges.payment_method.card.store = false`
  - `charges.payment_method.holder.name`
  - `charges.payment_method.holder.tax_id`
  - amount in cents
  - customer name/email/tax ID
  - notification URL when deployed
- Tests/assertions that the backend maps:
  - `charges.status = PAID` to approved/paid
  - `charges.status = DECLINED` to rejected
  - `charges.payment_response.message` into the app response/status detail

Why it matters:
- This is the core transparent checkout contract for card payments.
- It proves the app is using the PagBank SDK encrypted-card flow and not exposing sensitive card data to the backend.
