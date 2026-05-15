# PagBank homologation and production notes

This note records the PagBank integration context for Bem Comer so future payment debugging does not depend on email history.

## Timeline

- May 7, 2026: PagBank Integration requested homologation logs for all payment methods that would be used. They asked for a real Sandbox test log containing request and response examples.
- May 11, 2026: Mauricio asked whether the API Order integration would use only Pix, credit card, and debit card.
- May 11, 2026: Yan confirmed the integration methods:
  - Pix
  - Credit card
  - Debit card with 3DS
  - No boleto, recurrence, split, PagBank wallet, Google Pay, Apple Pay, etc.
- May 11, 2026: The Sandbox evidence file was generated and sent:
  - `raw-pagbank-evidence/pagbank-homologation-log-bem-comer-unmasked-2026-05-11.txt`
- May 13, 2026: Mauricio replied that the account was released for production use and asked for a production environment test plus logs for final validation. He instructed the production token to be generated in iBanking under sales/platforms-checkout/integrations.

## Homologation file reference

The file sent to PagBank contains request and response blocks for the agreed payment methods:

- Pix QR Code: `POST https://sandbox.api.pagseguro.com/orders`
- Credit card: `POST https://sandbox.api.pagseguro.com/orders`
- 3DS session before debit: `POST https://sandbox.sdk.pagseguro.com/checkout-sdk/sessions`
- Debit card with 3DS: `POST https://sandbox.api.pagseguro.com/orders`

The file intentionally omits Authorization/Bearer headers. Keep it that way in future evidence files.

## What PagBank's public docs say

PagBank documents the expected sequence as:

1. Test the integration in Sandbox.
2. Send request/response logs for homologation.
3. After approval, generate production credentials.
4. Run production validation tests and send production logs.

Relevant docs:

- `https://developer.pagbank.com.br/docs/primeiros-passos`
- `https://developer.pagbank.com.br/docs/crie-sua-conta-pagbank`
- `https://developer.pagbank.com.br/docs/token-de-autenticacao`
- `https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-3ds-validacao-pagbank`
- `https://developer.pagbank.com.br/reference/objeto-order`
- `https://developer.pagbank.com.br/reference/motivos-de-compra-negada`

Important notes from those docs:

- Production access depends on homologation approval.
- Production token generation does not automatically prove every API capability or card rail is fully validated.
- 3DS can be used for credit and debit.
- `authentication_method` is required for `DEBIT_CARD`.
- Card charges include a holder name and holder tax ID.

## Production checks observed

The production environment is configured as production in the running API container:

- `PAGBANK_ENV=production`
- `NEXT_PUBLIC_PAGBANK_ENV=production`
- `PAGBANK_ACCESS_TOKEN` is present

Pix production test worked:

- Payment method: Pix
- PagBank order: `ORDE_00E7ADDD-B0DA-4FFA-80F9-9204048037B2`
- App status: paid
- Webhook: received and processed

Card production attempts reached PagBank but were declined by PagBank/card authorization:

- Debit order: `ORDE_2BD911C9-E293-4FA1-ABF4-F44A507D40AC`
  - Charge: `CHAR_CFC9D3DA-6AF9-4D2C-A015-773CCAF80178`
  - Method: `DEBIT_CARD`
  - 3DS sent: yes, `authentication_method.type=THREEDS`
  - Status: `DECLINED`
  - Code: `20017`
  - Message: `TRANSACAO NAO PERMITIDA - NAO TENTE NOVAMENTE`
- Credit order: `ORDE_D9783ED8-92CA-4FE3-B1CF-CBC7CB4DC714`
  - Method: `CREDIT_CARD`
  - 3DS sent: no
  - Status: `DECLINED`
  - Code: `10000`
  - Message: `NAO AUTORIZADO PELO PAGSEGURO`
- Credit order: `ORDE_C73BF5F2-53A0-4916-A2E0-C31D46370F6A`
  - Method: `CREDIT_CARD`
  - 3DS sent: no
  - Status: `DECLINED`
  - Code: `10000`
  - Message: `NAO AUTORIZADO PELO PAGSEGURO`

Earlier credit detail also showed code `20159`, meaning PagBank wanted authentication for that credit card attempt.

## App-side finding fixed after production tests

The checkout UI already asked for `Nome no Cartao`, but the final backend charge did not receive that value. The browser used the cardholder name for encryption and debit 3DS, while the backend sent `order.customerName` as PagBank `payment_method.holder.name`.

That meant a checkout customer name such as `Yan` could be sent as the final card holder name even if the typed cardholder name was a full legal name.

Fix:

- Send `cardholderName` from the credit and debit forms to the payment API.
- Validate it in the API DTOs.
- Carry it through the credit/debit payment use cases.
- Use it as PagBank `payment_method.holder.name` for final card charges.
- Keep card number, CVV, expiration, and raw card data out of the backend payload.

This fix does not guarantee debit approval. It removes an app-side mismatch before retesting. If debit still returns `20017` with 3DS and correct holder data, send the production logs to PagBank and ask whether debit online with 3DS is fully enabled for the seller/token.

## Suggested message to PagBank after retest

```text
Boa tarde, Mauricio.

Ambiente: producao
Token: gerado no iBanking conforme orientacao

Pix:
- Funcionando, QR Code gerado e webhook recebido corretamente.

Debito:
- Order PagBank: <ORDER_ID>
- Charge: <CHARGE_ID>
- Status: <STATUS>
- payment_response.code: <CODE>
- payment_response.message: <MESSAGE>
- 3DS enviado: sim, authentication_method.type=THREEDS
- Nome do portador e CPF enviados no holder da cobranca.

Credito:
- Order PagBank: <ORDER_ID>
- Charge: <CHARGE_ID>
- Status: <STATUS>
- payment_response.code: <CODE>
- payment_response.message: <MESSAGE>

Poderia validar se o seller/token esta habilitado para transacoes de credito com autenticacao 3DS e debito online com 3DS em producao?
```
