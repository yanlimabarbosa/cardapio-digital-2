# Feature 1: Identificação de Clientes (Token + Senha Opcional)

## Visão Geral

Sistema de identificação de clientes baseado em **token opaco** (UUID) persistido no localStorage, com **senha opcional** para proteger a conta.

- **Camada base**: Token opaco (UUIDv4) no localStorage. Zero fricção. O cliente informa telefone + nome → backend cria/encontra Customer → retorna token.
- **Camada opcional**: Senha. O cliente pode definir uma senha a qualquer momento para proteger sua conta. Depois disso, recuperar o acesso (novo dispositivo, localStorage limpo) exige a senha — phone + name sozinhos não bastam mais.

**Por que essa abordagem**: O sistema já usa localStorage para o carrinho. A identificação segue o mesmo padrão. Mas sem uma senha, qualquer pessoa que saiba o telefone + nome de alguém pode chamar `identify` e roubar a sessão (e os pontos de fidelidade). A senha resolve isso sem impor fricção a quem não quer.

**Segurança**: O token é um UUIDv4 (122 bits de aleatoriedade = 5.3×10³⁶ possibilidades) — computacionalmente inviável adivinhar. A senha é hasheada com bcrypt. O token é o "como o dispositivo se identifica", a senha é o "como o dono prova que é dono".

**Dependências**: Nenhuma direta (pode ser implementada em paralelo com Feature 3 v1).

---

## Fluxo do Usuário (Cliente)

### Header — Estados

```
┌─ Não logado ──────────────────────────────────────────────┐
│  [Logo]              [Entrar/Cadastrar]  [Carrinho (3)]   │
└───────────────────────────────────────────────────────────┘

┌─ Logado ──────────────────────────────────────────────────┐
│  [Logo]   [Meus Pedidos]   [Minha Conta ▾]  [Carrinho]   │
│                             ┌──────────────────┐          │
│                             │ Editar perfil    │          │
│                             │ Trocar senha     │          │
│                             │ Programa de      │          │
│                             │  fidelidade 🔒   │          │
│                             │ Sair             │          │
│                             └──────────────────┘          │
└───────────────────────────────────────────────────────────┘
```

- **"Meus Pedidos"**: Visível quando logado. Link para `/meus-pedidos`.
- **"Minha Conta"**: Dropdown com opções de perfil.
- **"Programa de fidelidade"**: Visível no dropdown, mas com 🔒 se `hasPassword === false`. Ao clicar sem senha, redireciona para definir senha primeiro.

### Fluxo 1: Entrar/Cadastrar (via header)

**Step 1 — Dialog de telefone:**

```
┌──────────────────────────────────────┐
│              ✕                       │
│                                      │
│   Informe seu número de telefone     │
│   Ele é importante para falarmos     │
│   com você caso necessário           │
│                                      │
│   Telefone                           │
│   [(00) 90000-0000               ]   │
│                                      │
│   [        CONFIRMAR             ]   │
│                                      │
└──────────────────────────────────────┘
```

Backend recebe o phone e verifica:

**Step 2a — Telefone novo → Cadastro:**

```
┌──────────────────────────────────────┐
│              ✕                       │
│                                      │
│   Faltam algumas informações         │
│   Você só precisa preencher estes    │
│   dados uma vez                      │
│                                      │
│   Telefone *                         │
│   [(83) 98827-2839               ]   │  ← pre-filled, read-only
│                                      │
│   Seu nome *                         │
│   [_____________________________]    │
│                                      │
│   Escolha uma senha. Ela será usada  │
│   para garantir que só você terá     │
│   acesso a suas informações          │
│                                      │
│   Senha *                            │
│   [_____________________________]    │
│                                      │
│   Confirmar Senha *                  │
│   [_____________________________]    │
│                                      │
│   [        CONFIRMAR             ]   │
│                                      │
└──────────────────────────────────────┘
```

Backend cria Customer com name + passwordHash + token → logado.

**Step 2b — Telefone existe com senha → Login:**

```
┌──────────────────────────────────────┐
│              ✕                       │
│                                      │
│   Bem-vindo de volta!                │
│                                      │
│   Senha *                            │
│   [_____________________________]    │
│                                      │
│   [        ENTRAR                ]   │
│                                      │
└──────────────────────────────────────┘
```

**Step 2c — Telefone existe sem senha → Logado direto:**

Backend regenera token → frontend salva → logado. Pode ver pedidos.
Sem fricção — mas sem acesso a fidelidade até definir senha.

### Fluxo 2: Visita posterior (já tem token)

1. App carrega → Zustand hydrata do localStorage → tem token
2. Header mostra "Minha Conta" + "Meus Pedidos"
3. Ao criar pedido, token vai no header → backend associa ao Customer
4. Se token inválido (limpou storage, outro device) → header volta a "Entrar/Cadastrar"

### Fluxo 3: Meus Pedidos

1. Cliente clica "Meus Pedidos" no header → vai pra `/meus-pedidos`
2. **Pedidos ativos**: Exibidos normalmente (em andamento, aguardando)
3. **Pedidos finalizados**:
   - Se `hasPassword === true` → exibe histórico completo
   - Se `hasPassword === false` → card trancado: "Pedidos finalizados são mostrados apenas após o cadastro de uma senha" + link "Clique aqui e cadastre sua senha"

### Fluxo 4: Definir senha (upgrade da conta)

Pode acontecer de 3 formas:
1. Ao clicar "Programa de fidelidade" no dropdown (redireciona para definir senha)
2. Ao clicar "Clique aqui e cadastre sua senha" nos pedidos finalizados
3. Via "Trocar senha" no dropdown (se nunca definiu, funciona como "Definir")

Dialog:
```
┌──────────────────────────────────────┐
│              ✕                       │
│                                      │
│   Defina sua senha                   │
│   Ela protege sua conta e dá acesso  │
│   ao programa de fidelidade          │
│                                      │
│   Senha *                            │
│   [_____________________________]    │
│                                      │
│   Confirmar Senha *                  │
│   [_____________________________]    │
│                                      │
│   [        CONFIRMAR             ]   │
│                                      │
└──────────────────────────────────────┘
```

### Fluxo 5: Trocar de dispositivo

1. Novo dispositivo → sem token → "Entrar/Cadastrar"
2. Phone step → phone exists
3. **Com senha**: Pede senha → login → token regenerado → device antigo perde acesso
4. **Sem senha**: Logado direto → token regenerado → device antigo perde acesso

> **Um token por vez**: Sessão única por dispositivo. Troca de celular invalida o anterior automaticamente.

---

## Fluxo do Admin

1. Admin acessa **Clientes** (`/admin/customers`)
2. Vê lista de clientes com: nome, telefone, total de pedidos, pontos, data de cadastro
3. Busca por nome ou telefone
4. Pode ver detalhes de um cliente: pedidos, transações de pontos
5. Pode fazer ajuste manual de pontos (Feature 2)

---

## Entidade do Banco

### Customer (nova)

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `id` | uuid PK | `gen_random_uuid()` | ID interno (FK em outras tabelas) |
| `token` | uuid UNIQUE | `gen_random_uuid()` | Token opaco para o frontend (o que vai no localStorage) |
| `name` | varchar(255) | | Nome do cliente |
| `phone` | varchar(20) UNIQUE | | Telefone normalizado (só dígitos) |
| `email` | varchar(255) | `null` | Opcional |
| `passwordHash` | varchar(255) | `null` | null = sem senha (bcrypt) |
| `loyaltyPoints` | int | `0` | Saldo atual de pontos |
| `isActive` | boolean | `true` | Soft delete |
| `createdAt` | timestamptz | `now()` | |
| `updatedAt` | timestamptz | `now()` | |

**Nota**: `id` e `token` são ambos UUIDs, mas com propósitos diferentes:
- `id` = chave primária interna (usado em FKs: `orders.customer_id`, `loyalty_transactions.customer_id`)
- `token` = identificador público (enviado pelo frontend, nunca exposto em URLs ou logs)

Separar os dois impede que um atacante que descubra um `customer_id` (ex: em um response de admin) consiga se autenticar.

### Order — Campo novo

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `customer_id` | uuid FK → customers NOT NULL | | Todo pedido pertence a um customer |

### Migration

```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  phone varchar(20) NOT NULL UNIQUE,
  email varchar(255),
  password_hash varchar(255),
  loyalty_points int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_token ON customers(token);

ALTER TABLE orders ADD COLUMN customer_id uuid NOT NULL REFERENCES customers(id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

---

## Endpoints da API

### Novos endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/api/customers/identify` | — | Phone → verifica se existe, retorna status (step 1) |
| `POST` | `/api/customers/register` | — | Phone + name + password → cria customer → retorna token |
| `POST` | `/api/customers/login` | — | Phone + password → valida → retorna token |
| `POST` | `/api/customers/set-password` | Token | Define senha (para quem entrou sem senha) |
| `GET` | `/api/customers/me` | Token | Perfil + saldo de pontos |
| `GET` | `/api/customers/orders` | Token | Todos os pedidos do customer (paginado) |

### Detalhamento

#### `POST /api/customers/identify`

Step 1 do auth dialog. Verifica se o telefone já existe e qual o próximo passo.

**Request:**
```json
{
  "phone": "11999887766"
}
```

**Response — Telefone novo → precisa cadastrar:**
```json
{
  "exists": false,
  "action": "register"
}
```

**Response — Existe com senha → precisa logar:**
```json
{
  "exists": true,
  "hasPassword": true,
  "action": "login"
}
```

**Response — Existe sem senha → logado direto:**
```json
{
  "exists": true,
  "hasPassword": false,
  "action": "authenticated",
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customer": {
    "name": "João Silva",
    "phone": "11999887766",
    "hasPassword": false,
    "loyaltyPoints": 0
  }
}
```

#### `POST /api/customers/register`

Cria novo customer com senha. Step 2a (telefone novo).

**Request:**
```json
{
  "phone": "11999887766",
  "name": "João Silva",
  "password": "minhasenha123"
}
```

**Response (201):**
```json
{
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customer": {
    "name": "João Silva",
    "phone": "11999887766",
    "hasPassword": true,
    "loyaltyPoints": 0
  }
}
```

**Errors:**
- `409` — Telefone já cadastrado (race condition, usar login)

#### `POST /api/customers/login`

Login com telefone + senha. Step 2b (telefone existe com senha).

**Request:**
```json
{
  "phone": "11999887766",
  "password": "minhasenha123"
}
```

**Response (200):**
```json
{
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "customer": {
    "name": "João Silva",
    "phone": "11999887766",
    "hasPassword": true,
    "loyaltyPoints": 150
  }
}
```

**Errors:**
- `401` — Senha incorreta

#### `POST /api/customers/set-password`

Define senha para customer logado sem senha. Desbloqueia fidelidade e pedidos finalizados.

**Headers:** `X-Customer-Token: a1b2c3d4-...`

**Request:**
```json
{
  "password": "minhasenha123"
}
```

**Response (200):**
```json
{
  "customer": {
    "name": "João Silva",
    "phone": "11999887766",
    "hasPassword": true,
    "loyaltyPoints": 0
  }
}
```

**Validações:**
- Senha mínimo 6 caracteres
- Se já tem senha → `409 Conflict`
- Token atual continua válido

#### `GET /api/customers/me`

Perfil do customer identificado pelo token.

**Headers:** `X-Customer-Token: a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Response (200):**
```json
{
  "name": "João Silva",
  "phone": "11999887766",
  "email": null,
  "loyaltyPoints": 150,
  "totalOrders": 12,
  "memberSince": "2026-01-15T10:30:00Z"
}
```

**Response (401) — Token inválido:**
```json
{
  "message": "Token inválido"
}
```

#### `GET /api/customers/orders`

Todos os pedidos do customer (paginado).

**Headers:** `X-Customer-Token: a1b2c3d4-...`
**Query:** `?page=1&limit=10`

**Response (200):**
```json
{
  "orders": [
    {
      "id": "uuid",
      "orderNumber": 42,
      "status": "delivered",
      "totalAmount": 45.90,
      "deliveryType": "delivery",
      "pointsEarned": 4,
      "items": [
        {
          "productName": "Coxinha",
          "quantity": 3,
          "unitPrice": 6.50,
          "subtotal": 19.50
        }
      ],
      "createdAt": "2026-03-20T19:30:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "totalPages": 2
}
```

### Endpoint modificado

#### `POST /api/orders` — Aceita token

O endpoint de criação de pedido agora requer `customerPhone` (obrigatório) e aceita `X-Customer-Token` como header:
- Se token presente → busca Customer pelo token → associa ao pedido
- Se token ausente → faz `findOrCreate` pelo phone/name do DTO → retorna token no response
- `customerPhone` é **obrigatório** — todo pedido precisa de um customer

**Response modificado** (CreateOrder):
```json
{
  "id": "order-uuid",
  "orderNumber": 47,
  "customerToken": "a1b2c3d4-...",
  "...": "..."
}
```

O `customerToken` é sempre retornado para o frontend salvar no localStorage.

---

## Backend — Implementação

### 1. Novo módulo: `customers/`

```
modules/customers/
├── customers.module.ts
├── customers.controller.ts
├── customers.service.ts
├── customer-token.guard.ts
└── dto/
    ├── identify.dto.ts        — { phone }
    ├── register.dto.ts        — { phone, name, password }
    ├── login.dto.ts           — { phone, password }
    └── set-password.dto.ts    — { password }
```

Módulo simples — sem Passport, sem JWT. Um guard que lê `X-Customer-Token` e busca no banco. bcrypt para hash de senhas.

### 2. Customer Entity

```typescript
@Entity({ tableName: 'customers' })
export class Customer {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ type: 'uuid', unique: true, defaultRaw: 'gen_random_uuid()' })
  token!: string;

  @Property()
  name!: string;

  @Property({ unique: true, length: 20 })
  phone!: string;

  @Property({ nullable: true })
  email?: string;

  @Property({ nullable: true })
  passwordHash?: string;

  @Property({ default: 0 })
  loyaltyPoints: number = 0;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
```

### 3. Customer Token Guard

Guard simples que resolve o token no header para um Customer:

```typescript
@Injectable()
export class CustomerTokenGuard implements CanActivate {
  constructor(private readonly em: EntityManager) {}

  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-customer-token'];

    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    // Validar formato UUID antes de buscar (evita queries inválidas)
    if (!isUUID(token)) {
      throw new UnauthorizedException('Token inválido');
    }

    const customer = await this.em.findOne(Customer, { token, isActive: true });
    if (!customer) {
      throw new UnauthorizedException('Token inválido');
    }

    request.customer = customer;
    return true;
  }
}
```

Uso nos controllers:

```typescript
@Get('me')
@UseGuards(CustomerTokenGuard)
getProfile(@Req() req: Request) {
  return this.customersService.getProfile(req.customer);
}
```

### 4. CustomersService

```typescript
@Injectable()
export class CustomersService {
  constructor(private readonly em: EntityManager) {}

  // Step 1: Verifica se phone existe e qual ação tomar
  async identify(phone: string) {
    const normalized = phone.replace(/\D/g, '');
    const customer = await this.em.findOne(Customer, { phone: normalized });

    if (!customer) {
      return { exists: false, action: 'register' as const };
    }

    if (customer.passwordHash) {
      return { exists: true, hasPassword: true, action: 'login' as const };
    }

    // Existe sem senha → loga direto, regenera token
    customer.token = crypto.randomUUID();
    await this.em.flush();
    return {
      exists: true,
      hasPassword: false,
      action: 'authenticated' as const,
      token: customer.token,
      customer: this.formatCustomer(customer),
    };
  }

  // Step 2a: Novo customer com senha
  async register(phone: string, name: string, password: string) {
    const normalized = phone.replace(/\D/g, '');
    const existing = await this.em.findOne(Customer, { phone: normalized });
    if (existing) {
      throw new ConflictException('Telefone já cadastrado');
    }

    const customer = this.em.create(Customer, {
      phone: normalized,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      token: crypto.randomUUID(),
    });
    await this.em.flush();

    return { token: customer.token, customer: this.formatCustomer(customer) };
  }

  // Step 2b: Login com senha
  async login(phone: string, password: string) {
    const normalized = phone.replace(/\D/g, '');
    const customer = await this.em.findOne(Customer, { phone: normalized });

    if (!customer || !customer.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Senha incorreta');
    }

    // Regenerar token (revoga sessão anterior)
    customer.token = crypto.randomUUID();
    await this.em.flush();

    return { token: customer.token, customer: this.formatCustomer(customer) };
  }

  // Define senha para quem entrou sem senha
  async setPassword(customer: Customer, password: string) {
    if (customer.passwordHash) {
      throw new ConflictException('Já possui senha cadastrada');
    }
    customer.passwordHash = await bcrypt.hash(password, 10);
    await this.em.flush();
    return { customer: this.formatCustomer(customer) };
  }

  async findByToken(token: string): Promise<Customer | null> {
    return this.em.findOne(Customer, { token, isActive: true });
  }

  async getProfile(customer: Customer) {
    const orderCount = await this.em.count(Order, { customer });
    return {
      ...this.formatCustomer(customer),
      totalOrders: orderCount,
      memberSince: customer.createdAt!.toISOString(),
    };
  }

  async getOrders(customer: Customer, page: number, limit: number) {
    const [orders, total] = await this.em.findAndCount(
      Order,
      { customer },
      { populate: ['items'], orderBy: { createdAt: 'DESC' }, limit, offset: (page - 1) * limit },
    );
    return {
      orders: orders.map(o => this.formatOrder(o)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private formatCustomer(customer: Customer) {
    return {
      name: customer.name,
      phone: customer.phone,
      hasPassword: !!customer.passwordHash,
      loyaltyPoints: customer.loyaltyPoints,
    };
  }
}
```

### 5. OrdersService.create() — Associar customer

Duas formas de resolver, por prioridade:

```typescript
async create(dto: CreateOrderDto) {
  // ... store open check ...

  const em = this.em.fork();

  // NOVO: Resolver customer (obrigatório — customerPhone is required)
  let customer: Customer;

  if (dto._customerToken) {
    // Token veio no header (frontend já identificado)
    const found = await em.findOne(Customer, { token: dto._customerToken, isActive: true });
    if (found) {
      customer = found;
    } else {
      // Token inválido → fallback para findOrCreate
      const result = await this.customersService.identify(dto.customerPhone, dto.customerName);
      customer = result.customer!;
    }
  } else {
    // Sem token → criar/encontrar por phone
    const result = await this.customersService.identify(dto.customerPhone, dto.customerName);
    customer = result.customer!;
  }

  const order = em.create(Order, {
    // ... campos existentes ...
    customer, // ← FK NOT NULL
  });

  // ... restante do fluxo ...

  return {
    ...this.formatOrder(order),
    customerToken: customer.token,
  };
}
```

### 6. Order Entity — Campo novo

```typescript
@ManyToOne(() => Customer)
customer!: Customer;
```

---

## Frontend — Implementação

### Novo: `stores/customer-store.ts`

```typescript
interface CustomerState {
  token: string | null;
  name: string | null;
  phone: string | null;
  hasPassword: boolean;
  loyaltyPoints: number;
  setCustomer: (token: string, name: string, phone: string, hasPassword: boolean, loyaltyPoints: number) => void;
  setHasPassword: (has: boolean) => void;
  setLoyaltyPoints: (points: number) => void;
  clear: () => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      token: null,
      name: null,
      phone: null,
      hasPassword: false,
      loyaltyPoints: 0,
      setCustomer: (token, name, phone, hasPassword, loyaltyPoints) =>
        set({ token, name, phone, hasPassword, loyaltyPoints }),
      setHasPassword: (hasPassword) => set({ hasPassword }),
      setLoyaltyPoints: (loyaltyPoints) => set({ loyaltyPoints }),
      clear: () => set({ token: null, name: null, phone: null, hasPassword: false, loyaltyPoints: 0 }),
    }),
    { name: 'cardapio-customer' },
  ),
);
```

### API helper — Injetar token nos requests

```typescript
// lib/customer-api.ts
export function getCustomerHeaders(): Record<string, string> {
  const token = useCustomerStore.getState().token;
  return token ? { 'X-Customer-Token': token } : {};
}

export async function customerFetch(url: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...getCustomerHeaders(),
    },
  });
}
```

### Novos hooks

```
hooks/customer/
├── use-customer-identify.ts    — POST /customers/identify (mutation, step 1: phone check)
├── use-customer-register.ts    — POST /customers/register (mutation, step 2a: phone+name+password)
├── use-customer-login.ts       — POST /customers/login (mutation, step 2b: phone+password)
├── use-customer-set-password.ts — POST /customers/set-password (mutation, define senha)
├── use-customer-profile.ts     — GET /customers/me
├── use-customer-orders.ts      — GET /customers/orders
└── use-loyalty.ts              — GET /customer/loyalty (Feature 2)
```

### Novo componente: Auth Dialog

```
components/auth/
├── auth-dialog.tsx              — Dialog principal (controla steps)
├── phone-step.tsx               — Step 1: campo de telefone
├── register-step.tsx            — Step 2a: nome + senha + confirmar
├── login-step.tsx               — Step 2b: campo de senha
└── set-password-dialog.tsx      — Dialog separado para definir senha
```

**Auth dialog é um componente global** — montado no layout, controlado pelo customer store. Pode ser aberto de qualquer lugar: header, checkout, meus pedidos.

### Nova página: `/meus-pedidos`

```
app/meus-pedidos/
├── page.tsx
└── _components/
    ├── my-orders-client.tsx
    └── use-my-orders-page.ts
```

**Tela:**
- **Pedidos ativos**: Cards com status em tempo real
- **Pedidos finalizados**:
  - `hasPassword === true` → lista completa
  - `hasPassword === false` → card trancado com CTA "Clique aqui e cadastre sua senha"

### Modificações no layout

#### `app/layout.tsx` — Header com auth

```tsx
// Header states:
const { token, name, hasPassword } = useCustomerStore();
const isLoggedIn = !!token;

{isLoggedIn ? (
  <>
    <Link href="/meus-pedidos">Meus Pedidos</Link>
    <DropdownMenu>
      <DropdownMenuTrigger>Minha Conta ▾</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Editar perfil</DropdownMenuItem>
        <DropdownMenuItem>Trocar senha</DropdownMenuItem>
        <DropdownMenuItem disabled={!hasPassword}>
          Programa de fidelidade {!hasPassword && '🔒'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </>
) : (
  <Button onClick={openAuthDialog}>Entrar / Cadastrar</Button>
)}
```

#### `cart-store.ts` — Remove customerName/customerPhone

```diff
 interface CartState {
   items: CartItem[];
-  customerName: string;       // ← REMOVE
-  customerPhone: string;      // ← REMOVE
   notes: string;
   deliveryType: 'pickup' | 'delivery';
   deliveryAddress: DeliveryAddress;
   ...
 }
```

Nome e telefone vêm do `useCustomerStore()`.

#### `use-checkout-page.ts` — Requer identificação

```typescript
const { token, name, phone } = useCustomerStore();

// Se não está logado, abre auth dialog antes de prosseguir
if (!token) {
  openAuthDialog();
  return;
}

const order = await createOrder.mutateAsync({
  // name/phone não vão mais no body — backend resolve pelo token
  paymentMethod,
  deliveryType,
  ...
});
```

#### `use-create-order.ts` — Token no header

```typescript
export function useCreateOrder() {
  return useMutation({
    mutationFn: async (dto: CreateOrderDto) => {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCustomerHeaders(), // ← X-Customer-Token
        },
        body: JSON.stringify(dto),
      });
      // ...
    },
  });
}
```

### Nova página admin: `/admin/customers`

```
app/admin/customers/
├── page.tsx
└── _components/
    ├── customers-client.tsx
    └── use-customers-page.ts
```

Lista de clientes com busca, total de pedidos, saldo de pontos.

#### `admin/layout.tsx`

Novo item no nav: "Clientes" → `/admin/customers`

---

## Como tudo se conecta — Separação de Stores

### ANTES (atual)

```
cardapio-cart → { items, customerName, customerPhone, notes, deliveryType, ... }
```

Tudo junto. O carrinho guarda dados do cliente E dos itens. Problema: dados do cliente estão acoplados ao carrinho, não persistem entre pedidos de forma útil, e não há como referenciar o customer no backend.

### DEPOIS (com Feature 1)

```
┌─ localStorage ──────────────────────────────────────────────────┐
│                                                                  │
│  cardapio-customer → { token, name, phone, hasPassword, points } │ ← IDENTIDADE
│  cardapio-cart     → { items, notes, deliveryType, address, ... }│ ← COMPRAS
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- **`cardapio-customer`**: Quem é o cliente. Token para auth, nome/telefone para pré-preencher UI, pontos para exibir saldo.
- **`cardapio-cart`**: O que o cliente quer comprar. Itens, notas, entrega. **Sem dados de identidade** — `customerName` e `customerPhone` são removidos daqui.

O carrinho referencia o cliente pelo token (via header `X-Customer-Token`), nunca por dados duplicados.

### Fluxo de dados

```
  cardapio-customer (token)          cardapio-cart (items)
         │                                  │
         │  X-Customer-Token header         │  body: { items, notes, ... }
         ▼                                  ▼
    ┌── POST /api/orders ───────────────────────────┐
    │  1. Resolve customer pelo token (obrigatório)  │
    │  2. Lê name/phone do Customer (não do DTO)     │
    │  3. Calcula itens + extras + entrega            │
    │  4. Aplica cupom (Feature 3)                    │
    │  5. Processa resgates (Feature 2)               │
    │  6. Cria Order com customer FK (NOT NULL)       │
    └────────────────────────────────────────────────┘
```

### Refactoring do cart-store.ts

```diff
 interface CartState {
   items: CartItem[];
-  customerName: string;       // ← REMOVE
-  customerPhone: string;      // ← REMOVE
   notes: string;
   deliveryType: 'pickup' | 'delivery';
   deliveryAddress: DeliveryAddress;
   deliveryAreaId: string | null;
   deliveryFee: number;
   // ... actions (remove setCustomerName, setCustomerPhone)
 }
```

### Refactoring do use-cart-page.ts

O formulário do carrinho muda:
- **Nome e telefone**: Lidos do `useCustomerStore()`, exibidos como read-only (ou editáveis se for a primeira vez)
- **Identificação**: Se `customerStore.token` é null, mostra form de identify (phone + name) antes de prosseguir
- Os handlers `handleNameChange` e `handlePhoneChange` passam a atualizar o customer store via `identify` endpoint

### Refactoring do use-checkout-page.ts

```diff
 // ANTES:
-const { items, customerName, customerPhone, notes, ... } = useCartStore();
+const { items, notes, ... } = useCartStore();
+const { token, name: customerName, phone: customerPhone } = useCustomerStore();

 // O pedido usa o token para resolver o customer no backend
 const order = await createOrder.mutateAsync({
-  customerName,
-  customerPhone,
+  // name/phone não são mais enviados no body — backend resolve pelo token
   paymentMethod,
   deliveryType,
   ...
 });
```

### Refactoring do CreateOrderDto

```diff
 // ANTES:
 export interface CreateOrderDto {
-  customerName: string;
-  customerPhone: string;
   customerEmail?: string;
   paymentMethod: PaymentMethod;
   deliveryType: 'pickup' | 'delivery';
   ...
 }

 // name/phone vêm do Customer resolvido pelo token no backend
 // O DTO não precisa mais desses campos
```

> **Nota**: O `customerName` e `customerPhone` permanecem na Order entity (snapshot do momento do pedido), mas são preenchidos pelo backend a partir do Customer, não do DTO.

---

## Regras de Negócio

1. **Phone = identificador humano, Token = identificador técnico**: Phone é único e usado para lookup. Token é o segredo no localStorage.

2. **Um token ativo por customer**: Login/register/identify regeneram o token. Sessão única por dispositivo.

3. **Token nunca expira**: Válido até ser regenerado. Cliente não perde acesso.

4. **Token ≠ Customer ID**: Token é segredo, ID é chave interna. Nunca retornar ID para o frontend.

5. **Registro pede senha**: Novos customers são criados com senha obrigatória (phone + name + password). Isso garante que a maioria dos users tem conta completa.

6. **Phone-only identify = acesso básico**: Customers existentes sem senha são logados direto (edge case). Têm acesso limitado — pedidos ativos sim, finalizados e fidelidade não.

7. **Senha desbloqueia**: Pedidos finalizados, programa de fidelidade, editar perfil, trocar senha. Tudo que tem "valor" está atrás da senha.

8. **Pedidos funcionam sem senha**: O cliente identificado (com token) pode fazer e acompanhar pedidos normalmente. Senha não bloqueia a operação core.

9. **Senha é one-way upgrade**: Uma vez definida, não pode ser removida. Pode ser alterada (futuro: change-password endpoint).

10. **cardapio-cart não guarda dados do customer**: Cart store = itens + delivery + notes. Customer store = token + name + phone + hasPassword + points. Separação clara.

---

## Modelo de Acesso por Camada

```
┌────────────────────────────────────────────────────────────────────┐
│ Camada              │ Requer          │ Funcionalidades            │
├─────────────────────┼─────────────────┼────────────────────────────┤
│ Anônimo             │ nada            │ Navegar cardápio,          │
│                     │                 │ montar carrinho            │
├─────────────────────┼─────────────────┼────────────────────────────┤
│ Identificado        │ token           │ Fazer pedidos (vinculados  │
│ (sem senha)         │ (phone-only     │ à conta), ver pedidos      │
│                     │  identify)      │ ativos                     │
├─────────────────────┼─────────────────┼────────────────────────────┤
│ Conta completa      │ token +         │ Tudo acima + pedidos       │
│ (com senha)         │ senha definida  │ finalizados, programa de   │
│                     │                 │ fidelidade, editar perfil, │
│                     │                 │ trocar senha               │
└────────────────────────────────────────────────────────────────────┘
```

- **Novos users**: Registram com senha direto → conta completa de cara.
- **Users sem senha**: Podem existir se foram criados via pedido antes do sistema de auth (edge case), ou se entraram só pelo phone. Têm acesso básico (pedidos ativos) até definirem senha.
- **Senha é gate para**: pedidos finalizados, programa de fidelidade, editar perfil.

---

## Verificação

### Auth flow
1. **Cadastro novo**: Header "Entrar/Cadastrar" → phone → "register" → name+senha → logado → header mostra "Minha Conta"
2. **Login existente**: Header "Entrar/Cadastrar" → phone → "login" → senha → logado
3. **Phone sem senha**: Header "Entrar/Cadastrar" → phone → "authenticated" → logado direto (sem senha)
4. **Senha incorreta**: Login → senha errada → 401 → mensagem de erro

### Header
5. **Não logado**: Header mostra "Entrar/Cadastrar", sem "Meus Pedidos"
6. **Logado**: Header mostra "Meus Pedidos" + "Minha Conta ▾"
7. **Dropdown**: Editar perfil, Trocar senha, Programa de fidelidade (🔒 se sem senha), Sair
8. **Sair**: Limpa customer store → header volta a "Entrar/Cadastrar"

### Meus Pedidos
9. **Pedidos ativos**: Visíveis para qualquer logado (com ou sem senha)
10. **Pedidos finalizados com senha**: Lista completa de histórico
11. **Pedidos finalizados sem senha**: Card trancado + CTA "Cadastre sua senha"

### Fidelidade
12. **Fidelidade com senha**: Acumula pontos, vê saldo, resgata
13. **Fidelidade sem senha**: Item 🔒 no dropdown, redireciona para definir senha

### Token
14. **Token persiste**: Recarregar app → token no localStorage → continua logado
15. **Troca de dispositivo**: Login no device B → token regenerado → device A perde acesso
16. **Token inválido**: UUID aleatório → 401 → header volta a "Entrar/Cadastrar"

### Admin
17. **Admin clientes**: `/admin/customers` → lista → buscar por nome/telefone
