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
- Public app: `http://173.249.34.217`
- Target domain: `cardapiobemcomer.com.br`

Do not store VPS passwords, database passwords, JWT secrets, or Mercado Pago tokens in tracked docs. Keep production secrets only in `/opt/bem-comer/.env` and local ignored notes.

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

DNS is managed in Hostinger. Point these records to the new VPS:

- `@` A record -> `173.249.34.217`
- `www` A record -> `173.249.34.217` or CNAME to `@`

Check DNS:

```bash
dig +short cardapiobemcomer.com.br A
dig +short www.cardapiobemcomer.com.br A
```

Only run Certbot after both names resolve to `173.249.34.217`:

```bash
ssh cardapioweb
certbot --nginx \
  -d cardapiobemcomer.com.br \
  -d www.cardapiobemcomer.com.br \
  --redirect
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
