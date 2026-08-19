# Deploy — Bem Comer (cardapio-digital-2)

Guia operacional de deploy e operação do Bem Comer. Cobre ambiente de
produção, ambiente local de desenvolvimento e a **Estação de impressão
(auto-comprovante)** no PC do balcão.

> Não versione senhas do VPS, senha do banco, segredos de JWT ou tokens de
> pagamento. Mantenha os segredos de produção apenas em `/opt/bem-comer/.env`.

---

## 1. Produção

### Infra

- **Provedor:** Contabo VPS, Ubuntu.
- **Acesso SSH:** alias `cardapioweb` (usuário root).
- **Caminho da app:** `/opt/bem-comer`.
- **Compose:** `docker-compose.prod.yml`.
- **Containers:** `bem-comer-web-1`, `bem-comer-api-1`,
  `bem-comer-postgres-1`, `bem-comer-redis-1`.
- **Domínio:** `https://cardapiobemcomer.com.br` (nginx no host + Certbot/TLS).
- **Portas internas (só `127.0.0.1`):** web → `3010`, api → `3011`
  (proxy nginx em `/api/*`).
- **Banco:** PostgreSQL, database `cardapio_digital_2`.
- **Painel admin:** `https://cardapiobemcomer.com.br/admin`.

### Fluxo de deploy (sem CI)

Não há pipeline de CI. A deploy key do servidor é **somente leitura**, então o
push é feito a partir de um **clone LOCAL**; o servidor apenas puxa e reconstrói.

**1. Localmente:** commite e faça push da branch `master`.

```bash
git push origin master
```

**2. No servidor — backup do banco ANTES de qualquer coisa:**

```bash
ssh cardapioweb
cd /opt/bem-comer

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres cardapio_digital_2 \
  > /opt/bem-comer-backups/backup-$(date +%Y%m%d-%H%M%S).sql
```

**3. Atualizar o código para o estado de `origin/master`:**

```bash
git fetch --all
git reset --hard origin/master
```

**4. Reconstruir as imagens:**

```bash
docker compose -f docker-compose.prod.yml build api web
```

**5. Aplicar as migrations do MikroORM a partir da NOVA imagem**
(config compilado, sem ts-node):

```bash
docker compose -f docker-compose.prod.yml run --rm \
  -e MIKRO_ORM_CLI_CONFIG=/app/apps/api/dist/config/mikro-orm.config.js \
  -e MIKRO_ORM_CLI_USE_TS_NODE=false \
  api ./node_modules/.bin/mikro-orm migration:up
```

**6. Subir os serviços atualizados:**

```bash
docker compose -f docker-compose.prod.yml up -d api web
```

### Verificação pós-deploy

```bash
docker compose -f docker-compose.prod.yml ps
curl -sS 'https://cardapiobemcomer.com.br/api/store/status' | head -c 500
```

---

## 2. Desenvolvimento local

```bash
# 1. Dependências
pnpm install

# 2. Buildar o pacote compartilhado (consumido por api e web)
pnpm --filter @cardapio/shared build

# 3. Subir postgres (:5436) e redis (:6381)
pnpm db:up

# 4. Configurar variáveis de ambiente (na raiz do repo)
#    copie de .env.example e ajuste conforme necessário
cp .env.example .env

# 5. Migrations (a partir de apps/api)
cd apps/api
pnpm exec mikro-orm migration:up
cd ../..

# 6. Seed do Bem Comer (NÃO use o seed genérico `pnpm seed`)
pnpm --filter api seed:bemcomer
```

Testes E2E (Playwright): a config sobe automaticamente api em `:3334` e web em
`:3848`.

```bash
pnpm test:e2e
```

---

## 3. Estação de impressão (auto-comprovante)

Impressão em modo **kiosk** no PC do balcão: quando um pedido passa para o
status **"pronto"** (`ready`), a aba aberta do quadro de pedidos do admin
**imprime automaticamente** o comprovante na impressora térmica, **sem caixa de
diálogo de impressão**.

### Como funciona

- O quadro de pedidos (`/admin/orders`) mantém uma conexão WebSocket com a
  cozinha. Ao receber a transição de status para `ready`, a aba dispara a
  impressão do comprovante (`/receipt/<id>`) num iframe oculto e chama
  `window.print()`.
- Com o Chrome iniciado em `--kiosk-printing`, esse `print()` sai direto na
  **impressora padrão do sistema**, sem diálogo.
- O toggle **"Estação de impressão (auto-comprovante)"** fica no topo do quadro
  de pedidos. O estado é persistido **naquele navegador** via `localStorage`,
  chave `bemcomer.printStation`.

### Configuração no PC do balcão

**Passo 1 — Impressora padrão do SO.**
Defina a impressora térmica como a **impressora padrão** do sistema
operacional. É para ela que o `--kiosk-printing` envia a impressão silenciosa.
Confira também tamanho de papel/margens no perfil da impressora.

**Passo 2 — Abrir o Chrome em modo kiosk-printing.**
Inicie o Chrome com a flag `--kiosk-printing` apontando para o quadro de
pedidos:

```bash
google-chrome --kiosk-printing https://cardapiobemcomer.com.br/admin/orders
```

> A flag `--kiosk-printing` é o que faz o Chrome imprimir sem diálogo. Sem ela,
> cada impressão abre a caixa de diálogo do sistema. No Windows use o mesmo
> parâmetro no atalho do `chrome.exe`
> (ex.: `chrome.exe --kiosk-printing https://cardapiobemcomer.com.br/admin/orders`).

**Passo 3 — Logar e ligar o toggle.**
Faça login em `/admin`, abra o **quadro de pedidos** e marque o checkbox
**"Estação de impressão (auto-comprovante)"**. O toggle fica salvo naquele
navegador (`localStorage` → `bemcomer.printStation`), então continua ligado
após reiniciar o Chrome no mesmo perfil.

### Comportamento (observações)

- **Só imprime a aba com o toggle LIGADO.** Abas/PCs com o toggle desligado não
  imprimem — assim você controla exatamente qual máquina é a estação de
  impressão. Se abrir o quadro em mais de uma aba com o toggle ligado, cada uma
  imprime a sua cópia.
- **Uma impressão por pedido, na transição para `ready`.** Há deduplicação em
  memória: cada pedido é impresso **uma única vez** por transição para "pronto".
- **Recarregar a aba não reimprime pedidos já prontos.** A impressão só é
  disparada pela transição ao vivo (evento de WebSocket), não pela carga
  inicial do quadro. Ao dar reload, pedidos que já estavam em "pronto" não são
  reimpressos.

### Solução de problemas

- **Abre o diálogo de impressão em vez de imprimir sozinho:** o Chrome não foi
  aberto com `--kiosk-printing`. Feche todas as janelas do Chrome e reabra com a
  flag.
- **Nada imprime:** confirme que o toggle está LIGADO nessa aba e que a
  impressora térmica é a padrão do SO. Teste imprimindo `/receipt/<id>` na mão.
- **Toggle "esquece" o estado:** o `localStorage` é por perfil/navegador. Use
  sempre o mesmo perfil do Chrome no PC do balcão (evite janela anônima).
