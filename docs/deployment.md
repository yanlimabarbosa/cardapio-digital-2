# Deployment — Cardapio Digital 2 / Bem Comer

This server now runs only Bem Comer (`cardapio-digital-2`). Tapiocaria is no longer deployed on this VPS.

## Current Production

- Provider: Contabo VPS, raw Ubuntu 24.04
- SSH alias: `cardapioweb`
- IP: `173.249.34.217`
- App path: `/opt/bem-comer`
- Uploads volume: `/opt/bem-comer-data/uploads`
- Environment file: `/opt/bem-comer/.env`
- Compose file: `/opt/bem-comer/docker-compose.prod.yml`
- Nginx site: `/etc/nginx/sites-available/bem-comer`
- Git remote: `git@github.com-cardapio-digital-2:yanlimabarbosa/cardapio-digital-2.git`
- Deploy key: `/root/.ssh/cardapio_digital_2_deploy` (read-only GitHub deploy key)
- Public app: `https://cardapiobemcomer.com.br`
- Raw IP fallback: `http://173.249.34.217`
- Domain: `cardapiobemcomer.com.br`
- TLS certificate: Let's Encrypt, installed with Certbot for `cardapiobemcomer.com.br` and `www.cardapiobemcomer.com.br`

Do not store VPS passwords, database passwords, JWT secrets, or payment gateway tokens in tracked docs. Keep production secrets only in `/opt/bem-comer/.env` and local ignored notes.

## Services

`docker-compose.prod.yml` runs:

- `postgres`: PostgreSQL 17, volume `bem-comer_pgdata`, exposed only on `127.0.0.1:5433`
- `redis`: Redis 7, exposed only on `127.0.0.1:6380`
- `api`: NestJS API, exposed only on `127.0.0.1:3011`
- `web`: Next.js app, exposed only on `127.0.0.1:3010`

Nginx listens on ports 80/443 and proxies:

- `/` -> `http://127.0.0.1:3010`
- `/api/` -> `http://127.0.0.1:3011`
- `/uploads/` -> `http://127.0.0.1:3011`
- `/socket.io/` -> `http://127.0.0.1:3011`

The web build should use:

```env
NEXT_PUBLIC_API_URL=same-origin
```

That keeps browser requests on the same host, so the app works on the raw IP during setup and on the domain after DNS cutover.

## Update Existing Deploy

The server has a real Git clone in `/opt/bem-comer`. After committing and pushing locally, deploy with:

```bash
ssh cardapioweb
cd /opt/bem-comer

git pull --ff-only
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml run --rm api pnpm exec mikro-orm migration:up --config ./src/config/mikro-orm.config.ts
docker compose -f docker-compose.prod.yml up -d api web
```

If the menu data needs to be reset from scratch, run only the Bem Comer seed:

```bash
docker compose -f docker-compose.prod.yml run --rm api pnpm seed:bemcomer
```

Do not run `pnpm seed`, which is the older generic seed.

## Private Repo Bootstrap

The VPS uses a read-only GitHub deploy key. If rebuilding the server from scratch, either add `/root/.ssh/cardapio_digital_2_deploy.pub` as a read-only deploy key in GitHub or deploy a temporary local committed tree over SSH:

```bash
git archive --format=tar HEAD | ssh cardapioweb '
  rm -rf /opt/bem-comer
  mkdir -p /opt/bem-comer
  tar -xf - -C /opt/bem-comer
'
```

Then copy/create `/opt/bem-comer/.env` on the server with production secrets.

## Build And Start

```bash
ssh cardapioweb
cd /opt/bem-comer

docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml run --rm api pnpm exec mikro-orm migration:up --config ./src/config/mikro-orm.config.ts
docker compose -f docker-compose.prod.yml run --rm api pnpm seed:bemcomer
docker compose -f docker-compose.prod.yml up -d api web
```

Use only the Bem Comer seed. Do not run `pnpm seed`, which is the older generic seed.

## Payments

PagBank is the only payment gateway in the current payment flow.

Current integration state:

- Mercado Pago runtime support has been removed from the payment flow.
- `mercadopago` has been removed from the API dependencies.
- Pix uses the PagBank Orders API with `qr_codes`.
- Credit card uses the PagBank transparent checkout SDK in the browser and sends only `encryptedCard` to the API.
- Debit card uses the PagBank transparent checkout SDK with 3DS authentication. The browser creates the 3DS auth result, then the API sends `DEBIT_CARD`, `card.encrypted`, and `authentication_method.type = THREEDS` to PagBank.
- The checkout always collects payer e-mail and CPF, which PagBank requires for Pix/card payments.
- Payment notifications are handled at `/api/webhooks/pagbank`.
- PagBank order and charge webhooks are mapped back to local orders by `reference_id`.

Sandbox is passing for Pix, credit card, denied credit card, and debit card with 3DS through `pnpm test:e2e`.

Temporary payment environment as of 2026-05-06:

- The public VPS is intentionally configured to use PagBank sandbox for homologation/testing.
- `API_PUBLIC_URL` remains `https://cardapiobemcomer.com.br`, so PagBank sandbox can call the public webhook URL.
- `PAGBANK_ENV=sandbox`
- `NEXT_PUBLIC_PAGBANK_ENV=sandbox`
- `PAGBANK_ACCESS_TOKEN`, `PAGBANK_WEBHOOK_TOKEN`, and `NEXT_PUBLIC_PAGBANK_PUBLIC_KEY` are copied from the local sandbox `.env`.
- Old Mercado Pago env vars were removed from local and VPS `.env` files:
  - `MP_ACCESS_TOKEN`
  - `MP_PUBLIC_KEY`
  - `MP_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_MP_PUBLIC_KEY`

This means public checkout payments are sandbox/test payments until the production cutover below is completed.

Real PagBank sandbox webhook delivery is not tested from localhost because PagBank needs a public URL. Use either the deployed sandbox configuration or a public tunnel, following `docs/pagbank-real-sandbox-webhook.md`.

Production is still blocked by PagBank account authorization:

```text
ACCESS_DENIED - whitelist access required. Contact PagSeguro
```

PagBank must approve/whitelist the production account before production charges can be created through the Orders API.

If the PagBank panel has a webhook/notification URL field, use:

```text
https://cardapiobemcomer.com.br/api/webhooks/pagbank
```

For production, configure:

```env
PAGBANK_ENV=production
PAGBANK_ACCESS_TOKEN=...
PAGBANK_WEBHOOK_TOKEN=...
NEXT_PUBLIC_PAGBANK_ENV=production
NEXT_PUBLIC_PAGBANK_PUBLIC_KEY=...
```

Production cutover checklist:

1. Replace the sandbox values in `/opt/bem-comer/.env` with production PagBank credentials.
2. Keep `API_PUBLIC_URL=https://cardapiobemcomer.com.br`.
3. Set `PAGBANK_ENV=production`.
4. Set `NEXT_PUBLIC_PAGBANK_ENV=production`.
5. Set the production `PAGBANK_ACCESS_TOKEN`.
6. Set the production `PAGBANK_WEBHOOK_TOKEN`.
7. Set the production `NEXT_PUBLIC_PAGBANK_PUBLIC_KEY`.
8. Rebuild and restart `api` and `web`.
9. Run a low-value Pix/card production validation only after PagBank approves/whitelists the account.

Changing the PagBank environment or public key requires rebuilding `api` and `web` because the frontend SDK environment and public key are compiled into the Next.js build.

After changing payment env vars:

```bash
ssh cardapioweb
cd /opt/bem-comer
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml up -d api web
```

## Ingredient Images

Copy the Bem Comer source images to a temporary server folder:

```bash
rsync -az /home/yan/Downloads/bemcomercardapio/ \
  cardapioweb:/opt/bem-comer-data/uploads/bemcomer-source-images/
```

Run the image seed:

```bash
ssh cardapioweb
cd /opt/bem-comer
docker compose -f docker-compose.prod.yml run --rm api \
  pnpm seed:bemcomer:ingredient-images -- /app/apps/api/uploads/bemcomer-source-images
rm -rf /opt/bem-comer-data/uploads/bemcomer-source-images
docker compose -f docker-compose.prod.yml up -d api web
```

Current seed result from the fresh VPS deploy:

- 31 source images copied
- 123 option rows updated with images
- 2 product rows updated with images
- Missing source mappings: `Couve`, `Pernil suíno`, `Posta de atum frita`, `Repolho refogado`

## Domain And SSL

Nginx is already configured for:

- `cardapiobemcomer.com.br`
- `www.cardapiobemcomer.com.br`
- `173.249.34.217`

DNS is managed in Hostinger. Current records should be:

- `@` A record -> `173.249.34.217`
- `www` CNAME -> `cardapiobemcomer.com.br` or A record -> `173.249.34.217`

Check DNS:

```bash
dig +short cardapiobemcomer.com.br A
dig +short www.cardapiobemcomer.com.br A
```

HTTPS is already installed. Certbot renews it automatically. To inspect the certificate:

```bash
ssh cardapioweb
certbot certificates
```

If the server is rebuilt or the cert is missing, run Certbot after both names resolve to `173.249.34.217`:

```bash
ssh cardapioweb
certbot --nginx \
  -d cardapiobemcomer.com.br \
  -d www.cardapiobemcomer.com.br \
  --non-interactive --agree-tos --register-unsafely-without-email --redirect
```

## Verification

```bash
ssh cardapioweb
cd /opt/bem-comer

docker compose -f docker-compose.prod.yml ps
curl -I http://127.0.0.1:3010
curl -sS http://127.0.0.1:3011/api/menu | head -c 300
curl -I http://173.249.34.217
curl -sS http://173.249.34.217/api/menu | head -c 300
curl -I https://cardapiobemcomer.com.br
curl -sS https://cardapiobemcomer.com.br/api/menu | head -c 300

docker compose -f docker-compose.prod.yml exec -T postgres psql \
  -U postgres -d cardapio_digital_2 \
  -c "select count(*) as products from products;" \
  -c "select count(*) filter (where image_url is not null) as options_with_images, count(*) as options_total from product_extras;"
```

Expected fresh Bem Comer counts:

- 6 categories
- 31 products
- 134 options
- 123 options with images
