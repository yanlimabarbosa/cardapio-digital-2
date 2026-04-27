# Feature 2: Sistema de Fidelidade / Pontos

## Visão Geral

Sistema de pontos onde o cliente ganha pontos ao completar pedidos e pode resgatá-los por produtos gratuitos. O admin configura: taxa de conversão (pontos por real), quais produtos são resgatáveis e o custo em pontos.

**Por que existe**: Fidelidade é o que transforma um cliente ocasional em cliente recorrente. O sistema de pontos cria um incentivo direto para voltar — "só faltam 50 pontos para um bolo de cenoura grátis". É simples de entender e eficaz.

**Dependências**:
- Feature 1 (Identificação) — obrigatória. Pontos são associados ao Customer. Sem customer tracking, não há fidelidade.
- Feature 4 (Promoções) — desejável. Pontos são calculados sobre valor pago (excluindo itens promocionais já descontados).

---

## Fluxo do Usuário (Cliente)

### Fluxo 1: Ganhar pontos

1. Cliente faz pedido e paga (deve ter senha definida para acumular pontos)
2. Pedido é preparado e entregue (status DELIVERED)
3. Backend credita pontos automaticamente: `floor(valorPago / 100 * pointsPerReal)`
   - `valorPago` = totalAmount - deliveryFee - discountAmount - pontosGastos
   - Exemplo: Pedido R$50, entrega R$5, desconto R$10 → base R$35
   - Se `pointsPerReal = 10` → 35 * 10 / 100 = 3 pontos (floor)
4. Cliente recebe notificação (ou vê na próxima visita a `/meus-pedidos`)

### Fluxo 2: Ver saldo e extrato

1. Cliente logado acessa `/meus-pedidos`
2. Vê saldo de pontos em destaque: "Você tem **150 pontos**"
3. Link para extrato detalhado:
   - "+10 pontos — Pedido #42 — 20/03"
   - "-80 pontos — Resgate: Bolo de Cenoura — 22/03"
   - "+5 pontos — Pedido #45 — 24/03"

### Fluxo 3: Resgatar produto

1. No checkout, seção "Resgatar com pontos" aparece se cliente tem senha definida (`hasPassword`) e tem pontos
2. Lista produtos resgatáveis com custo em pontos: "Bolo de Cenoura — 80 pontos"
3. Cliente seleciona produto(s) para resgatar
4. Pontos são debitados, produto adicionado ao pedido com preço R$0
5. Saldo atualizado: "Saldo após resgate: 70 pontos"

**Exemplo concreto:**
- Cliente tem 150 pontos
- Produtos resgatáveis: Bolo de Cenoura (80pts), Suco Natural (40pts)
- Resgata Bolo de Cenoura
- Checkout: Itens normais R$45 + Bolo de Cenoura R$0 + Entrega R$5 = R$50
- Pontos debitados: 150 - 80 = 70 restantes
- Pontos ganhos pelo pedido: floor(45 / 100 * 10) = 4 pontos (base = total pago - entrega - resgate)
- Saldo final: 70 + 4 = 74 pontos

---

## Fluxo do Admin

### Configurar taxa de pontos

1. Admin acessa **Dashboard** → "Configurações da Loja"
2. Campo "Pontos por R$1 gasto": define a taxa (ex: 10 = a cada R$1, 10 pontos)
3. Valor 0 = sistema de fidelidade desativado (não mostra nada para o cliente)

### Configurar produtos resgatáveis

1. Admin acessa **Produtos** → edita produto
2. Seção "Fidelidade":
   - Toggle "Resgatável com pontos" (`isRedeemable`)
   - Campo "Custo em pontos" (`redemptionCost`)
3. Exemplo: Bolo de Cenoura → isRedeemable: true, redemptionCost: 80

### Ajuste manual de pontos

1. Admin acessa **Clientes** → seleciona cliente
2. Botão "Ajustar pontos"
3. Informa quantidade (+ ou -) e motivo
4. LoyaltyTransaction criada com type 'adjustment'

### Dashboard de fidelidade (opcional, futuro)

- Total de pontos em circulação
- Top clientes por pontos
- Resgates por período

---

## Entidades do Banco

### LoyaltyTransaction (nova)

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `id` | uuid PK | `gen_random_uuid()` | |
| `customer` | FK → Customer | | ManyToOne (obrigatório) |
| `order` | FK → Order | `null` | ManyToOne (nullable — ajuste manual não tem pedido) |
| `points` | int | | +ganho, -gasto |
| `type` | varchar(20) | | `'earn'` \| `'redeem'` \| `'adjustment'` |
| `description` | text | `null` | Ex: "Pedido #42", "Resgate: Bolo de Cenoura", "Ajuste manual: Compensação" |
| `createdAt` | timestamptz | `now()` | |

### Product — Campos novos

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `isRedeemable` | boolean | `false` | Pode ser resgatado com pontos |
| `redemptionCost` | int | `0` | Custo em pontos |

### Order — Campos novos

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `pointsEarned` | int | `0` | Pontos ganhos com este pedido |
| `pointsSpent` | int | `0` | Pontos gastos em resgates |

### OrderItem — Campos novos

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `isRedeemed` | boolean | `false` | Item foi resgatado com pontos |
| `pointsSpent` | int | `0` | Pontos gastos neste item |

### StoreSettings — Campo novo

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `pointsPerReal` | decimal(5,2) | `0` | Pontos por R$1 gasto (0 = desativado) |

### Migration

```sql
CREATE TABLE loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  order_id uuid REFERENCES orders(id),
  points int NOT NULL,
  type varchar(20) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_customer ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_order ON loyalty_transactions(order_id);

-- Product: novos campos
ALTER TABLE products ADD COLUMN is_redeemable boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN redemption_cost int NOT NULL DEFAULT 0;

-- Order: novos campos
ALTER TABLE orders ADD COLUMN points_earned int NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN points_spent int NOT NULL DEFAULT 0;

-- OrderItem: novos campos
ALTER TABLE order_items ADD COLUMN is_redeemed boolean NOT NULL DEFAULT false;
ALTER TABLE order_items ADD COLUMN points_spent int NOT NULL DEFAULT 0;

-- StoreSettings: novo campo
ALTER TABLE store_settings ADD COLUMN points_per_real decimal(5,2) NOT NULL DEFAULT 0;
```

---

## Endpoints da API

### Novos endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/api/customer/loyalty` | CustomerJWT | Saldo + extrato paginado |
| `GET` | `/api/customer/loyalty/redeemable` | CustomerJWT | Produtos resgatáveis |
| `POST` | `/api/admin/loyalty/adjust` | AdminJWT | Ajuste manual de pontos |

### Endpoints modificados

| Método | Path | Modificação |
|--------|------|-------------|
| `GET` | `/api/store/status` | Inclui `pointsPerReal` (0 = fidelidade off) |
| `GET` | `/api/customer-auth/me` | Já inclui `loyaltyPoints` |
| `POST` | `/api/orders` | Aceita `redeemedItems`, calcula pontos |

### Detalhamento

#### `GET /api/customer/loyalty`

**Headers:** `X-Customer-Token: <token>`
**Query:** `?page=1&limit=20`

**Response (200):**
```json
{
  "balance": 150,
  "transactions": [
    {
      "id": "uuid",
      "points": 10,
      "type": "earn",
      "description": "Pedido #42",
      "createdAt": "2026-03-20T20:30:00Z"
    },
    {
      "id": "uuid",
      "points": -80,
      "type": "redeem",
      "description": "Resgate: Bolo de Cenoura",
      "createdAt": "2026-03-22T19:15:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "totalPages": 1
}
```

#### `GET /api/customer/loyalty/redeemable`

Retorna produtos que podem ser resgatados, com saldo suficiente.

**Headers:** `X-Customer-Token: <token>`

**Response (200):**
```json
{
  "balance": 150,
  "products": [
    {
      "id": "uuid",
      "name": "Bolo de Cenoura",
      "imageUrl": "/uploads/bolo.jpg",
      "price": 12.90,
      "redemptionCost": 80,
      "canRedeem": true
    },
    {
      "id": "uuid",
      "name": "Suco Natural",
      "imageUrl": "/uploads/suco.jpg",
      "price": 8.50,
      "redemptionCost": 40,
      "canRedeem": true
    },
    {
      "id": "uuid",
      "name": "Pizza Margherita",
      "imageUrl": "/uploads/pizza.jpg",
      "price": 39.90,
      "redemptionCost": 300,
      "canRedeem": false
    }
  ]
}
```

#### `POST /api/admin/loyalty/adjust`

**Headers:** `Authorization: Bearer <adminJWT>` (admin auth, unchanged)

**Request:**
```json
{
  "customerId": "uuid",
  "points": 50,
  "description": "Compensação por problema no pedido #38"
}
```

**Response (200):**
```json
{
  "newBalance": 200,
  "transaction": {
    "id": "uuid",
    "points": 50,
    "type": "adjustment",
    "description": "Compensação por problema no pedido #38",
    "createdAt": "2026-03-25T14:00:00Z"
  }
}
```

`points` pode ser negativo para debitar.

---

## Backend — Implementação

### 1. LoyaltyTransaction Entity

```typescript
@Entity({ tableName: 'loyalty_transactions' })
export class LoyaltyTransaction {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Customer)
  customer!: Customer;

  @ManyToOne(() => Order, { nullable: true })
  order?: Order;

  @Property()
  points!: number;

  @Property({ length: 20 })
  type!: string; // 'earn' | 'redeem' | 'adjustment'

  @Property({ nullable: true, columnType: 'text' })
  description?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
```

### 2. Product Entity — Campos novos

```typescript
@Property({ default: false })
isRedeemable: boolean = false;

@Property({ default: 0 })
redemptionCost: number = 0;
```

### 3. Order Entity — Campos novos

```typescript
@Property({ default: 0 })
pointsEarned: number = 0;

@Property({ default: 0 })
pointsSpent: number = 0;
```

### 4. OrderItem Entity — Campos novos

```typescript
@Property({ default: false })
isRedeemed: boolean = false;

@Property({ default: 0 })
pointsSpent: number = 0;
```

### 5. StoreSettings Entity — Campo novo

```typescript
@Property({ columnType: 'decimal(5,2)', default: '0' })
pointsPerReal: string = '0';
```

### 6. OrdersService.create() — Processar resgates

```typescript
async create(dto: CreateOrderDto) {
  // ... passos 1-4 existentes ...

  // NOVO: Passo 5 — Processar itens resgatados
  let totalPointsSpent = 0;

  if (dto.redeemedItems?.length) {
    for (const redeemed of dto.redeemedItems) {
      const product = products.find(p => p.id === redeemed.productId);
      if (!product || !product.isRedeemable) {
        throw new BadRequestException(`Produto ${redeemed.productId} não é resgatável`);
      }

      totalPointsSpent += product.redemptionCost;

      // Criar OrderItem com preço R$0
      em.create(OrderItem, {
        order,
        productId: product.id,
        productName: product.name,
        unitPrice: '0.00',
        quantity: 1,
        subtotal: '0.00',
        isRedeemed: true,
        pointsSpent: product.redemptionCost,
      });
    }

    // Verificar se cliente tem pontos suficientes
    if (customer.loyaltyPoints < totalPointsSpent) {
      throw new BadRequestException('Pontos insuficientes para resgate');
    }

    // Debitar pontos atomicamente
    const result = await em.getConnection().execute(
      `UPDATE customers SET loyalty_points = loyalty_points - ? WHERE id = ? AND loyalty_points >= ?`,
      [totalPointsSpent, customer.id, totalPointsSpent],
    );
    if (result.affectedRows === 0) {
      throw new BadRequestException('Pontos insuficientes (concurrent update)');
    }

    order.pointsSpent = totalPointsSpent;
  }

  // ... passos 6-8 (delivery, cupom, total) ...

  // NOTA: Resgates NÃO entram no totalAmount.
  // Total = itens normais + entrega - desconto (resgate é grátis, já é R$0)

  await em.flush();

  // Registrar transação de resgate
  if (totalPointsSpent > 0) {
    const redeemNames = dto.redeemedItems!
      .map(r => products.find(p => p.id === r.productId)?.name)
      .filter(Boolean)
      .join(', ');
    em.create(LoyaltyTransaction, {
      customer,
      order,
      points: -totalPointsSpent,
      type: 'redeem',
      description: `Resgate: ${redeemNames}`,
    });
    await em.flush();
  }
}
```

### 7. OrdersService.updateStatus() — Creditar pontos no DELIVERED

```typescript
async updateStatus(id: string, newStatus: OrderStatus) {
  // ... validação de transição existente ...

  order.status = newStatus;

  // NOVO: Creditar pontos quando pedido é entregue (apenas se customer tem senha = fidelidade ativa)
  if (newStatus === OrderStatus.DELIVERED && order.customer.passwordHash) {
    const settings = await this.storeService.getSettings();
    const pointsPerReal = parseFloat(settings.pointsPerReal);

    if (pointsPerReal > 0) {
      // Base: total pago - entrega - desconto
      // Itens resgatados já são R$0, então não entram no totalAmount
      const totalCents = Math.round(parseFloat(order.totalAmount) * 100);
      const deliveryCents = order.deliveryFee ? Math.round(parseFloat(order.deliveryFee) * 100) : 0;
      const discountCents = order.discountAmount ? Math.round(parseFloat(order.discountAmount) * 100) : 0;

      const baseCents = totalCents - deliveryCents;
      // totalAmount já tem desconto subtraído, então não subtrair de novo
      const pointsEarned = Math.floor((baseCents / 100) * pointsPerReal);

      if (pointsEarned > 0) {
        // Creditar atomicamente
        await this.em.getConnection().execute(
          `UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?`,
          [pointsEarned, order.customer.id],
        );

        order.pointsEarned = pointsEarned;

        this.em.create(LoyaltyTransaction, {
          customer: order.customer,
          order,
          points: pointsEarned,
          type: 'earn',
          description: `Pedido #${order.orderNumber}`,
        });
      }
    }
  }

  await this.em.flush();
  // ...
}
```

### 8. LoyaltyService — Ajuste manual

```typescript
@Injectable()
export class LoyaltyService {
  async adjust(customerId: string, points: number, description: string) {
    const customer = await this.em.findOneOrFail(Customer, customerId);

    if (points < 0 && customer.loyaltyPoints < Math.abs(points)) {
      throw new BadRequestException('Saldo insuficiente para débito');
    }

    await this.em.getConnection().execute(
      `UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?`,
      [points, customerId],
    );

    const transaction = this.em.create(LoyaltyTransaction, {
      customer,
      points,
      type: 'adjustment',
      description,
    });

    await this.em.flush();

    return {
      newBalance: customer.loyaltyPoints + points,
      transaction,
    };
  }
}
```

---

## Frontend — Implementação

### Novos hooks

```
hooks/customer/
├── use-loyalty.ts           — GET /customer/loyalty (saldo + extrato)
└── use-redeemable-products.ts — GET /customer/loyalty/redeemable
```

### `use-checkout-page.ts` — Seção de resgate

```typescript
// Novos estados:
const [redeemedItems, setRedeemedItems] = useState<Array<{ productId: string }>>([]);
const { data: redeemable } = useRedeemableProducts(); // só se logado
const { token } = useCustomerStore();

function handleRedeemProduct(productId: string) {
  setRedeemedItems(prev => [...prev, { productId }]);
}

function handleRemoveRedeem(productId: string) {
  setRedeemedItems(prev => prev.filter(r => r.productId !== productId));
}

// Total de pontos a gastar:
const totalPointsToSpend = redeemedItems.reduce((sum, r) => {
  const product = redeemable?.products.find(p => p.id === r.productId);
  return sum + (product?.redemptionCost ?? 0);
}, 0);

// Enviar no pedido:
const order = await createOrder.mutateAsync({
  // ... existente ...
  redeemedItems: redeemedItems.length > 0 ? redeemedItems : undefined,
});
```

### `checkout-client.tsx` — UI de resgate

```tsx
{token && redeemable && redeemable.products.length > 0 && (
  <section>
    <h3>Resgatar com pontos</h3>
    <p>Saldo: {redeemable.balance} pontos</p>
    {redeemable.products
      .filter(p => p.canRedeem)
      .map(product => (
        <div key={product.id}>
          <span>{product.name}</span>
          <span>{product.redemptionCost} pts</span>
          <button onClick={() => handleRedeemProduct(product.id)}>
            Resgatar
          </button>
        </div>
      ))}
  </section>
)}
```

### Breakdown atualizado

```tsx
<div className="space-y-2 text-sm">
  <div className="flex justify-between">
    <span>Subtotal</span>
    <span>{formatCurrency(subtotal)}</span>
  </div>
  {redeemedItems.length > 0 && (
    <div className="flex justify-between text-purple-600">
      <span>Resgate ({totalPointsToSpend} pts)</span>
      <span>GRÁTIS</span>
    </div>
  )}
  {couponDiscount > 0 && (
    <div className="flex justify-between text-green-600">
      <span>Desconto ({couponCode})</span>
      <span>-{formatCurrency(couponDiscount)}</span>
    </div>
  )}
  {deliveryFee > 0 && (
    <div className="flex justify-between">
      <span>Entrega</span>
      <span>{formatCurrency(deliveryFee)}</span>
    </div>
  )}
  <div className="flex justify-between font-bold text-lg border-t pt-2">
    <span>Total</span>
    <span>{formatCurrency(totalAmount)}</span>
  </div>
</div>
```

### Shared Types

```typescript
// packages/shared/src/types/loyalty.ts
export interface LoyaltyTransactionResponse {
  id: string;
  points: number;
  type: 'earn' | 'redeem' | 'adjustment';
  description: string | null;
  createdAt: string;
}

export interface LoyaltyResponse {
  balance: number;
  transactions: LoyaltyTransactionResponse[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RedeemableProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  redemptionCost: number;
  canRedeem: boolean;
}

export interface RedeemableResponse {
  balance: number;
  products: RedeemableProduct[];
}
```

### `CreateOrderDto` — Campos novos

```typescript
export interface CreateOrderDto {
  // ... existente ...
  redeemedItems?: Array<{ productId: string }>;
}
```

### `products-client/product-dialog.tsx` (Admin) — Seção Fidelidade

```
┌──────────────────────────────────────┐
│ Fidelidade                           │
│ ☐ Resgatável com pontos              │
│                                      │
│ [Se marcado:]                        │
│ Custo em pontos: [80_____]           │
└──────────────────────────────────────┘
```

### `admin/dashboard-client/store-settings.tsx` — Campo pointsPerReal

```
┌──────────────────────────────────────┐
│ Fidelidade                           │
│ Pontos por R$1 gasto: [10___]       │
│ (0 = desativado)                     │
└──────────────────────────────────────┘
```

---

## Regras de Negócio

1. **Pontos calculados sobre valor pago efetivo**: `floor((totalAmount - deliveryFee) / 100 * pointsPerReal)`. O `totalAmount` já tem desconto de cupom subtraído. Itens resgatados já são R$0.

2. **Pontos creditados no DELIVERED**: Não no PAID. Evita crédito para pedidos cancelados. Só credita se o customer tem `passwordHash` (conta protegida).

3. **Debitar pontos atomicamente**: UPDATE com WHERE `loyalty_points >= cost`. Se dois resgates concorrentes, apenas um sucede.

4. **Um resgate por produto por pedido**: Não pode resgatar 2x o mesmo produto no mesmo pedido. Mas pode resgatar produtos diferentes.

5. **Resgate sem extras**: Produto resgatado vem sem extras. Se o cliente quer extras, paga o preço normal e adiciona extras normalmente.

6. **pointsPerReal = 0 desativa tudo**: Frontend não mostra nada de fidelidade. Backend não calcula pontos. Endpoints de loyalty retornam vazio.

7. **Fidelidade requer senha**: Só clientes com `hasPassword === true` acumulam e resgatam pontos. Isso incentiva o cliente a proteger a conta e permite rastrear pontos com confiança de que a conta pertence a quem diz ser.

7. **Ajuste manual auditado**: Toda alteração manual gera LoyaltyTransaction com type 'adjustment' e description obrigatória.

8. **Pontos não expiram (v1)**: Sem lógica de expiração. Simplifica o sistema e é mais amigável para o cliente. (Se necessário no futuro, pode ser adicionado via campo `expiresAt` na LoyaltyTransaction.)

9. **Resgates não geram pontos**: Um produto resgatado tem valor R$0, então não contribui para a base de cálculo de pontos do pedido.

10. **Pedido cancelado após DELIVERED**: Se um pedido for cancelado após entrega (estorno), os pontos creditados precisam ser estornados manualmente pelo admin via ajuste. Não há estorno automático.

---

## Verificação

1. **Configurar taxa**: Admin → Store Settings → pointsPerReal = 10 → salvar
2. **Configurar produto resgatável**: Admin → Produtos → Bolo de Cenoura → isRedeemable + 80pts → salvar
3. **Ganhar pontos**: Fazer pedido R$50 → DELIVERED → verificar: 50 * 10 / 100 = 5 pontos creditados
4. **Ver saldo**: `/meus-pedidos` → logado → ver "5 pontos"
5. **Ver extrato**: Link extrato → "+5 pontos — Pedido #1"
6. **Resgatar**: Checkout → "Resgatar com pontos" → selecionar Bolo → ver no breakdown
7. **Pontos debitados**: Após pedido → saldo = 5 - 80 = ... (precisa acumular mais primeiro)
8. **Ajuste manual**: Admin → Clientes → selecionar → "Ajustar +100 pontos"
9. **Desativado**: pointsPerReal = 0 → nada de fidelidade aparece para o cliente
10. **Race condition**: Dois resgates simultâneos com saldo limitado → apenas um sucede
