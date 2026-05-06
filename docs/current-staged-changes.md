# Current Staged Changes

This file documents the staged checkpoint that was present before creating this summary file on branch `feature/pagbank-integration-checkpoint`.

## Scope

The staged work replaces the payment flow with PagBank, adds debit card with PagBank 3DS, improves Pix/card payer validation, adds webhook processing and tests, records homologation guidance, and updates deployment/runtime configuration for Bem Comer.

## Payment Gateway

- Removed Mercado Pago runtime usage from the API payment service and dependency list.
- Added PagBank Orders API support for Pix QR Code payments.
- Added PagBank transparent checkout support for credit card payments using browser-side encrypted card data.
- Added PagBank debit card support using browser-side encrypted card data plus PagBank 3DS authentication.
- Added PagBank environment variables, public API URL handling, webhook token handling, evidence output settings, and frontend public key configuration.
- Added sanitized PagBank request/response evidence capture for homologation/debugging.

## API

- Enabled Nest raw body support so webhook signatures can be validated against the original request body.
- Added stricter DTO validation for Pix, credit card, and debit card payer/payment inputs.
- Added debit card payment DTO.
- Added PagBank webhook helper functions for signature validation, status mapping, reference normalization, and BullMQ enqueueing.
- Updated webhook controller to accept PagBank webhooks at `/api/webhooks/pagbank`.
- Updated payment processor to reconcile order/payment state from direct webhook status or by fetching the PagBank order.
- Added support for payment status values including `approved`, `pending`, `rejected`, and `refunded`.
- Added migration/snapshot changes to support the expanded payment method/status model.

## Web Checkout

- Added payer e-mail and CPF collection in checkout before payment creation.
- Added frontend validation for payer e-mail and CPF before order/payment API calls.
- Replaced Mercado Pago SDK usage with PagBank checkout SDK loading.
- Added Pix, credit, and debit payment tabs.
- Added a debit card form with PagBank 3DS session/authentication flow.
- Updated the credit card form to use PagBank `encryptCard`.
- Added Portuguese error mapping for PagBank SDK encryption errors and gateway errors.
- Added loading states and safer user-facing error messages for card/debit/Pix failures.
- Ensured the checkout uses the API-created order total, not locally mutable cart totals, for payment amounts.
- Added Pix waiting screen support for payment status polling and paid-order redirect.

## Admin, Receipt, And Shared Types

- Updated admin order cards/history to display debit card payment method.
- Updated receipt/order typing and shared payment/order types for debit card and PagBank response shapes.
- Added utility helpers for CPF formatting/validation and e-mail normalization/validation.

## Deployment And Runtime

- Updated production Docker and compose configuration for the current Bem Comer deployment.
- Documented the current VPS/domain/payment deployment state.
- Added ignored local PagBank integration notes/evidence paths.
- Added public URL guidance for real PagBank webhooks.

## Tests And Evidence

- Added Playwright configuration and e2e scripts.
- Added PagBank checkout e2e coverage for:
  - invalid payer e-mail and CPF blocking before order creation;
  - API DTO validation failures before gateway calls;
  - Pix QR Code creation;
  - Pix webhook-confirmed paid redirect using mocked webhook delivery;
  - credit card approved/denied flows;
  - encrypted-card payload assertions;
  - PagBank SDK encryption error messages;
  - debit card 3DS flow and documented 3DS scenario matrix;
  - protection against leaking raw card data from browser to API;
  - frontend handling for PagBank transient token/debit-card mismatch errors.
- Added isolated PagBank webhook tests for signature validation, payload mapping, ignored unmappable charge events, and queue contract.
- Added homologation evidence documentation and a real sandbox webhook test plan.
- Added a visual SVG diagram for Pix, credit card, and debit card payment flows.

## Documentation

- Added `docs/pagbank-missing-coverage.md` with remaining homologation gaps.
- Added `docs/pagbank-real-sandbox-webhook.md` with the real sandbox webhook test plan and all remaining PagBank gaps.
- Updated `docs/deployment.md` with current server/payment configuration and webhook testing notes.
- Added `docs/diagrams/payment-flows.svg` with visual flow diagrams.

## Staged Files Covered

```text
M  .env.example
M  .gitignore
M  apps/api/package.json
M  apps/api/src/main.ts
M  apps/api/src/migrations/.snapshot-cardapio_digital_2.json
A  apps/api/src/migrations/Migration20260505153000.ts
M  apps/api/src/modules/payments/dto/create-card-payment.dto.ts
A  apps/api/src/modules/payments/dto/create-debit-card-payment.dto.ts
M  apps/api/src/modules/payments/dto/create-pix-payment.dto.ts
A  apps/api/src/modules/payments/pagbank-webhook.ts
M  apps/api/src/modules/payments/payment.processor.ts
M  apps/api/src/modules/payments/payments.controller.ts
M  apps/api/src/modules/payments/payments.service.ts
M  apps/api/src/modules/payments/webhook.controller.ts
M  apps/web/Dockerfile
M  apps/web/src/app/admin/orders/_components/orders-client/order-card-content.tsx
M  apps/web/src/app/admin/orders/history/_components/orders-history-client.tsx
M  apps/web/src/app/checkout/_components/checkout-client.tsx
M  apps/web/src/app/checkout/_components/credit-card-form.tsx
A  apps/web/src/app/checkout/_components/debit-card-form.tsx
M  apps/web/src/app/checkout/_components/pix-payment.tsx
M  apps/web/src/app/checkout/_components/use-checkout-page.ts
M  apps/web/src/app/receipt/[id]/page.tsx
A  apps/web/src/hooks/payments/use-debit-card-payment.ts
A  apps/web/src/hooks/payments/use-pagbank-3ds-session.ts
M  apps/web/src/hooks/payments/use-pix-payment.ts
A  apps/web/src/lib/payment-provider.ts
M  apps/web/src/lib/utils.ts
M  docker-compose.prod.yml
M  docs/deployment.md
A  docs/diagrams/payment-flows.svg
A  docs/pagbank-missing-coverage.md
A  docs/pagbank-real-sandbox-webhook.md
M  package.json
M  packages/shared/src/types/order.ts
M  packages/shared/src/types/payment.ts
A  playwright.config.ts
M  pnpm-lock.yaml
A  tests/pagbank/pagbank-sandbox-checkout.spec.ts
A  tests/pagbank/pagbank-webhook.spec.ts
```
