# Feature 3: Sistema de Cupons

## Visão Geral

Sistema completo de cupons de desconto com regras flexíveis: percentual ou valor fixo, valor mínimo, validade por data/dia da semana/horário, restrições por produto/categoria/seção, limite de usos, e exclusão de itens promocionais.

**Por que existe**: Cupons são a principal ferramenta de marketing de um restaurante digital — atraem novos clientes ("BEMVINDO10"), incentivam pedidos em horários fracos ("HAPPYHOUR"), e recompensam clientes fiéis. A flexibilidade nas regras permite cobrir praticamente qualquer cenário promocional.

**Dependências**:
- Feature 4 (Promoções) — para `excludePromotional` funcionar, o campo `promotionActive` precisa existir
- Feature 1 (Identificação) — versão 2 usa `firstOrderOnly` e `maxUsesPerCustomer` (precisa de Customer)

---

## Fluxo do Usuário (Cliente)

### Fluxo: Aplicar cupom no checkout

1. Cliente monta o carrinho normalmente
2. Na página do carrinho, tem campo "Cupom de desconto"
3. Cliente digita o código (ex: "BEMVINDO10")
4. Frontend envia `POST /api/coupons/validate` com o código + dados do pedido
5. Backend valida todas as regras e retorna o desconto calculado
6. Frontend mostra breakdown: subtotal, desconto, entrega, total
7. Se inválido, mostra mensagem de erro descritiva
8. No checkout, o `couponCode` é enviado junto com o pedido
9. Backend recalcula e aplica o desconto (nunca confia no valor do frontend)

**Exemplo concreto — Cupom percentual:**
- Cupom: PROMO20 → 20% de desconto, máximo R$15, mínimo R$40
- Carrinho: R$60 em itens + R$5 entrega
- Desconto: 20% de R$60 = R$12 (< teto de R$15) ✓
- Total: R$60 - R$12 + R$5 = R$53

**Exemplo concreto — Happy Hour:**
- Cupom: HAPPYHOUR → 15% de desconto
- Restrição: Segunda a Quinta, 14:00-17:00
- Cliente tenta usar sábado às 20h → "Cupom válido apenas de segunda a quinta, entre 14:00 e 17:00"

**Exemplo concreto — Cupom com restrição de produto:**
- Cupom: PIZZA30 → R$30 de desconto
- Restrição: Apenas categoria "Pizzas"
- Carrinho: 1 Pizza Margherita (R$45) + 1 Refrigerante (R$8)
- Desconto aplicado sobre: R$45 (somente a pizza)
- Total: R$45 - R$30 + R$8 + R$5 (entrega) = R$28

---

## Fluxo do Admin

1. Admin acessa **Cupons** (`/admin/coupons`)
2. Vê lista de cupons com: código, tipo, valor, usos, status, validade
3. Cria novo cupom com formulário completo:

```
┌──────────────────────────────────────────────────────────┐
│ Criar Cupom                                              │
│                                                          │
│ Código: [BEMVINDO10_______]                              │
│                                                          │
│ Tipo de desconto: (●) Percentual  (○) Valor fixo        │
│ Valor: [20___]  (20% ou R$20)                            │
│ Desconto máximo: [15___] R$ (só para %)                  │
│                                                          │
│ ── Restrições de Pedido ──                               │
│ Valor mínimo do pedido: [40___] R$                       │
│ Qtd mínima de itens elegíveis: [0___]                    │
│ Tipo de entrega: (●) Ambos (○) Delivery (○) Retirada    │
│                                                          │
│ ── Validade ──                                           │
│ Data início: [__/__/____]                                │
│ Data fim:    [__/__/____]                                │
│ Dias da semana: ☑Seg ☑Ter ☑Qua ☑Qui ☐Sex ☐Sáb ☐Dom    │
│ Horário: de [14:00] até [17:00]                          │
│                                                          │
│ ── Limites de Uso ──                                     │
│ Limite total de usos: [100__] (0 = ilimitado)            │
│ Limite por cliente: [1____] (0 = ilimitado)              │
│ ☐ Apenas primeiro pedido do cliente                      │
│                                                          │
│ ── Escopo ──                                             │
│ ☐ Excluir produtos em promoção                           │
│ Produtos específicos: [Multi-select de produtos...]      │
│ Categorias específicas: [Multi-select de categorias...]  │
│ Seções específicas: [Multi-select de seções...]          │
│                                                          │
│                              [Cancelar] [Criar Cupom]    │
└──────────────────────────────────────────────────────────┘
```

4. Edita cupom existente (mesmo formulário)
5. Desativa cupom (soft delete via `isActive = false`)
6. Vê métricas: `currentUses` / `maxUses`, última utilização

---

## Entidades do Banco

### Coupon (nova)

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `id` | uuid PK | `gen_random_uuid()` | |
| `code` | varchar(50) UNIQUE | | Ex: "BEMVINDO10" (armazenado uppercase) |
| `discountType` | varchar(20) | | `'percentage'` \| `'fixed'` |
| `discountValue` | decimal(10,2) | | 20.00 (%) ou 10.00 (R$) |
| `maxDiscount` | decimal(10,2) | `null` | Teto para percentual (nullable) |
| `minOrderAmount` | decimal(10,2) | `0` | Pedido mínimo |
| `minQuantity` | int | `0` | Qtd mínima de itens elegíveis (0 = sem mínimo) |
| `validFrom` | timestamptz | `null` | Data início (nullable = já vale) |
| `validUntil` | timestamptz | `null` | Data fim (nullable = sem prazo) |
| `validDays` | jsonb | `null` | Dias da semana [0-6], null = todos |
| `validTimeFrom` | varchar(5) | `null` | Horário início "HH:MM" (nullable) |
| `validTimeTo` | varchar(5) | `null` | Horário fim "HH:MM" (nullable) |
| `maxUses` | int | `0` | 0 = ilimitado |
| `maxUsesPerCustomer` | int | `0` | 0 = ilimitado (Feature 1 necessária) |
| `currentUses` | int | `0` | Contador atômico |
| `firstOrderOnly` | boolean | `false` | Requer Feature 1 |
| `excludePromotional` | boolean | `false` | Ignora itens com promoção ativa |
| `deliveryTypeRestriction` | varchar(20) | `null` | null = ambos, `'pickup'` ou `'delivery'` |
| `applicableProductIds` | jsonb | `null` | null = todos |
| `applicableCategoryIds` | jsonb | `null` | null = todas |
| `applicableSectionIds` | jsonb | `null` | null = todas |
| `isActive` | boolean | `true` | Soft delete |
| `createdAt` | timestamptz | `now()` | |
| `updatedAt` | timestamptz | `now()` | |

### CouponUsage (nova)

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `id` | uuid PK | `gen_random_uuid()` | |
| `coupon` | FK → Coupon | | ManyToOne |
| `customer` | FK → Customer NOT NULL | | Todo uso de cupom tem um customer |
| `order` | FK → Order | | ManyToOne |
| `usedAt` | timestamptz | `now()` | |

### Order — Campos novos

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `coupon` | FK → Coupon | `null` | Nullable |
| `couponCode` | varchar(50) | `null` | Snapshot do código usado |
| `discountAmount` | decimal(10,2) | `null` | Desconto aplicado |

### Migration

```sql
CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL UNIQUE,
  discount_type varchar(20) NOT NULL,
  discount_value decimal(10,2) NOT NULL,
  max_discount decimal(10,2),
  min_order_amount decimal(10,2) NOT NULL DEFAULT 0,
  min_quantity int NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  valid_days jsonb,
  valid_time_from varchar(5),
  valid_time_to varchar(5),
  max_uses int NOT NULL DEFAULT 0,
  max_uses_per_customer int NOT NULL DEFAULT 0,
  current_uses int NOT NULL DEFAULT 0,
  first_order_only boolean NOT NULL DEFAULT false,
  exclude_promotional boolean NOT NULL DEFAULT false,
  delivery_type_restriction varchar(20),
  applicable_product_ids jsonb,
  applicable_category_ids jsonb,
  applicable_section_ids jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupons_code ON coupons(code);

CREATE TABLE coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ADD COLUMN coupon_id uuid REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN coupon_code varchar(50);
ALTER TABLE orders ADD COLUMN discount_amount decimal(10,2);
```

---

## Endpoints da API

### Novos endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/api/coupons/validate` | — | Valida cupom e retorna desconto calculado |
| `GET` | `/api/admin/coupons` | AdminJWT | Lista cupons (com stats) |
| `POST` | `/api/admin/coupons` | AdminJWT | Cria cupom |
| `PUT` | `/api/admin/coupons/:id` | AdminJWT | Atualiza cupom |
| `DELETE` | `/api/admin/coupons/:id` | AdminJWT | Desativa cupom |

### Detalhamento

#### `POST /api/coupons/validate`

Valida cupom contra as regras e retorna desconto estimado. O frontend usa isso para preview; o backend recalcula na criação do pedido.

**Request:**
```json
{
  "code": "BEMVINDO10",
  "items": [
    { "productId": "uuid", "quantity": 2, "extraIds": ["uuid"] }
  ],
  "deliveryType": "delivery",
  "customerPhone": "11999887766"
}
```

> `customerPhone` é obrigatório — necessário para validar `firstOrderOnly` e `maxUsesPerCustomer`.

**Response (200) — Válido:**
```json
{
  "valid": true,
  "code": "BEMVINDO10",
  "discountType": "percentage",
  "discountValue": 10,
  "calculatedDiscount": 8.50,
  "eligibleAmount": 85.00,
  "message": "Cupom aplicado: 10% de desconto"
}
```

**Response (200) — Inválido:**
```json
{
  "valid": false,
  "code": "BEMVINDO10",
  "reason": "Valor mínimo do pedido é R$40,00"
}
```

Nota: Retorna 200 mesmo quando inválido — `valid: false` com `reason` descritiva. Evita que o frontend trate erros de validação como erros HTTP.

#### `GET /api/admin/coupons`

**Headers:** `Authorization: Bearer <adminJWT>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "code": "BEMVINDO10",
    "discountType": "percentage",
    "discountValue": 10,
    "maxDiscount": 15,
    "currentUses": 23,
    "maxUses": 100,
    "isActive": true,
    "validFrom": null,
    "validUntil": "2026-04-30T23:59:59Z",
    "createdAt": "2026-03-01T10:00:00Z"
  }
]
```

#### `POST /api/admin/coupons`

**Headers:** `Authorization: Bearer <adminJWT>`

**Request:**
```json
{
  "code": "HAPPYHOUR",
  "discountType": "percentage",
  "discountValue": 15,
  "maxDiscount": 20,
  "minOrderAmount": 30,
  "validDays": [1, 2, 3, 4],
  "validTimeFrom": "14:00",
  "validTimeTo": "17:00",
  "maxUses": 0,
  "excludePromotional": true
}
```

**Response (201):** Cupom criado com todos os campos.

#### `PUT /api/admin/coupons/:id`

Atualiza campos do cupom. Mesma estrutura do POST.

#### `DELETE /api/admin/coupons/:id`

Soft delete: `isActive = false`. Cupom para de funcionar mas histórico mantido.

---

## Backend — Implementação

### 1. Novo módulo: `coupons/`

```
modules/coupons/
├── coupons.module.ts
├── coupons.controller.ts
├── coupons.service.ts
└── dto/
    ├── create-coupon.dto.ts
    ├── update-coupon.dto.ts
    └── validate-coupon.dto.ts
```

### 2. Entities

```typescript
// coupon.entity.ts
@Entity({ tableName: 'coupons' })
export class Coupon {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ unique: true, length: 50 })
  code!: string;

  @Property({ length: 20 })
  discountType!: string; // 'percentage' | 'fixed'

  @Property({ columnType: 'decimal(10,2)' })
  discountValue!: string;

  @Property({ nullable: true, columnType: 'decimal(10,2)' })
  maxDiscount?: string;

  @Property({ columnType: 'decimal(10,2)', default: '0' })
  minOrderAmount: string = '0';

  @Property({ default: 0 })
  minQuantity: number = 0;

  @Property({ nullable: true })
  validFrom?: Date;

  @Property({ nullable: true })
  validUntil?: Date;

  @Property({ type: 'jsonb', nullable: true })
  validDays?: number[];

  @Property({ nullable: true, length: 5 })
  validTimeFrom?: string;

  @Property({ nullable: true, length: 5 })
  validTimeTo?: string;

  @Property({ default: 0 })
  maxUses: number = 0;

  @Property({ default: 0 })
  maxUsesPerCustomer: number = 0;

  @Property({ default: 0 })
  currentUses: number = 0;

  @Property({ default: false })
  firstOrderOnly: boolean = false;

  @Property({ default: false })
  excludePromotional: boolean = false;

  @Property({ nullable: true, length: 20 })
  deliveryTypeRestriction?: string;

  @Property({ type: 'jsonb', nullable: true })
  applicableProductIds?: string[];

  @Property({ type: 'jsonb', nullable: true })
  applicableCategoryIds?: string[];

  @Property({ type: 'jsonb', nullable: true })
  applicableSectionIds?: string[];

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
```

```typescript
// coupon-usage.entity.ts
@Entity({ tableName: 'coupon_usages' })
export class CouponUsage {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Coupon)
  coupon!: Coupon;

  @ManyToOne(() => Customer)
  customer!: Customer;

  @ManyToOne(() => Order)
  order!: Order;

  @Property({ onCreate: () => new Date() })
  usedAt: Date = new Date();
}
```

### 3. CouponsService — Validação completa

O core do sistema é o método `validateAndCalculate()`:

```typescript
async validateAndCalculate(
  code: string,
  items: Array<{ productId: string; quantity: number; extraIds?: string[] }>,
  deliveryType: string,
  customerPhone: string,
): Promise<CouponValidationResult> {

  // 1. Buscar cupom ativo por código (uppercase)
  const coupon = await this.em.findOne(Coupon, {
    code: code.toUpperCase(),
    isActive: true
  });
  if (!coupon) return { valid: false, reason: 'Cupom não encontrado' };

  // 2. Verificar validade por data
  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    return { valid: false, reason: 'Cupom ainda não está válido' };
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return { valid: false, reason: 'Cupom expirado' };
  }

  // 3. Verificar dia da semana
  if (coupon.validDays && coupon.validDays.length > 0) {
    const today = now.getDay(); // 0=Dom, 1=Seg, ...
    if (!coupon.validDays.includes(today)) {
      const dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      const validNames = coupon.validDays.map(d => dayNames[d]).join(', ');
      return { valid: false, reason: `Cupom válido apenas: ${validNames}` };
    }
  }

  // 4. Verificar horário
  if (coupon.validTimeFrom && coupon.validTimeTo) {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (currentTime < coupon.validTimeFrom || currentTime > coupon.validTimeTo) {
      return { valid: false, reason: `Cupom válido entre ${coupon.validTimeFrom} e ${coupon.validTimeTo}` };
    }
  }

  // 5. Verificar tipo de entrega
  if (coupon.deliveryTypeRestriction && coupon.deliveryTypeRestriction !== deliveryType) {
    const label = coupon.deliveryTypeRestriction === 'delivery' ? 'delivery' : 'retirada';
    return { valid: false, reason: `Cupom válido apenas para ${label}` };
  }

  // 6. Verificar limite total de usos
  if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
    return { valid: false, reason: 'Cupom esgotado' };
  }

  // 7. Verificar limite por customer
  if (coupon.maxUsesPerCustomer > 0) {
    const normalized = customerPhone.replace(/\D/g, '');
    const customer = await this.em.findOne(Customer, { phone: normalized });
    if (customer) {
      const usageCount = await this.em.count(CouponUsage, { coupon, customer });
      if (usageCount >= coupon.maxUsesPerCustomer) {
        return { valid: false, reason: 'Você já usou este cupom o máximo de vezes permitido' };
      }
    }
  }

  // 8. Verificar firstOrderOnly
  if (coupon.firstOrderOnly) {
    const normalized = customerPhone.replace(/\D/g, '');
    const customer = await this.em.findOne(Customer, { phone: normalized });
    if (customer) {
      const orderCount = await this.em.count(Order, { customer });
      if (orderCount > 0) {
        return { valid: false, reason: 'Cupom válido apenas para o primeiro pedido' };
      }
    }
  }

  // 9. Buscar produtos para calcular valor elegível
  const products = await this.em.find(Product, { id: { $in: items.map(i => i.productId) } }, { populate: ['extras', 'category'] });

  // 10. Calcular valor elegível (apenas itens que passam nos filtros)
  let eligibleAmountCents = 0;
  let eligibleQuantity = 0;

  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) continue;

    // Filtro: excluir promocionais
    if (coupon.excludePromotional && isPromotionActive(product)) continue;

    // Filtro: produtos específicos
    if (coupon.applicableProductIds?.length && !coupon.applicableProductIds.includes(product.id)) continue;

    // Filtro: categorias específicas
    if (coupon.applicableCategoryIds?.length && !coupon.applicableCategoryIds.includes(product.category.id)) continue;

    // Filtro: seções específicas (requer join com SectionProduct)
    // ... lógica de verificação de seção

    const effectivePrice = getEffectivePrice(product);
    let extrasCents = 0;
    if (item.extraIds?.length) {
      for (const extraId of item.extraIds) {
        const extra = product.extras.getItems().find(e => e.id === extraId);
        if (extra) extrasCents += Math.round(parseFloat(extra.price) * 100);
      }
    }
    const unitCents = Math.round(parseFloat(effectivePrice) * 100) + extrasCents;
    eligibleAmountCents += unitCents * item.quantity;
    eligibleQuantity += item.quantity;
  }

  // 11. Verificar quantidade mínima de itens elegíveis
  if (coupon.minQuantity > 0 && eligibleQuantity < coupon.minQuantity) {
    return { valid: false, reason: `Mínimo de ${coupon.minQuantity} itens elegíveis necessários` };
  }

  // 12. Verificar valor mínimo
  const eligibleAmount = eligibleAmountCents / 100;
  const minOrder = parseFloat(coupon.minOrderAmount);
  if (eligibleAmount < minOrder) {
    return { valid: false, reason: `Valor mínimo do pedido é R$${minOrder.toFixed(2)}` };
  }

  // 13. Calcular desconto
  let discountCents: number;
  const discountValue = parseFloat(coupon.discountValue);

  if (coupon.discountType === 'percentage') {
    discountCents = Math.round(eligibleAmountCents * discountValue / 100);
    if (coupon.maxDiscount) {
      const maxCents = Math.round(parseFloat(coupon.maxDiscount) * 100);
      discountCents = Math.min(discountCents, maxCents);
    }
  } else {
    discountCents = Math.round(discountValue * 100);
  }

  // Desconto não pode ser maior que o valor elegível
  discountCents = Math.min(discountCents, eligibleAmountCents);

  return {
    valid: true,
    coupon,
    calculatedDiscount: discountCents / 100,
    eligibleAmount,
  };
}
```

### 4. OrdersService.create() — Aplicar cupom

```typescript
async create(dto: CreateOrderDto) {
  // ... passos 1-6 existentes (store check, customer, products, items, delivery) ...

  // NOVO: Passo 7 — Validar e aplicar cupom
  let discountCents = 0;
  let appliedCoupon: Coupon | null = null;

  if (dto.couponCode) {
    const validation = await this.couponsService.validateAndCalculate(
      dto.couponCode,
      dto.items,
      dto.deliveryType,
      dto.customerPhone, // obrigatório no DTO
    );
    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }
    discountCents = Math.round(validation.calculatedDiscount * 100);
    appliedCoupon = validation.coupon;
  }

  // Passo 8: Total final
  calculatedTotal -= discountCents;
  if (calculatedTotal < 0) calculatedTotal = 0;

  order.totalAmount = (calculatedTotal / 100).toFixed(2);
  if (appliedCoupon) {
    order.coupon = appliedCoupon;
    order.couponCode = appliedCoupon.code;
    order.discountAmount = (discountCents / 100).toFixed(2);
  }

  await em.flush();

  // Passo 11: Registrar uso do cupom
  if (appliedCoupon) {
    // Incremento atômico para evitar race condition
    await em.getConnection().execute(
      `UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ? AND (max_uses = 0 OR current_uses < max_uses)`,
      [appliedCoupon.id],
    );
    em.create(CouponUsage, {
      coupon: appliedCoupon,
      customer,
      order,
    });
    await em.flush();
  }

  // ...
}
```

---

## Frontend — Implementação

### Novo hook: `hooks/customer/use-validate-coupon.ts`

```typescript
export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (data: ValidateCouponRequest) => {
      const res = await fetch(`${API_URL}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json() as Promise<CouponValidationResponse>;
    },
  });
}
```

### `cart-store.ts` — Novos campos

```typescript
interface CartState {
  // ... existente ...
  couponCode: string | null;
  couponDiscount: number;
  setCoupon: (code: string | null, discount: number) => void;
  clearCoupon: () => void;
}
```

O `clearCart` também limpa o cupom.

### `use-cart-page.ts` — Campo de cupom

```typescript
// Novo estado:
const [couponInput, setCouponInput] = useState('');
const validateCoupon = useValidateCoupon();
const { couponCode, couponDiscount, setCoupon, clearCoupon } = useCartStore();

async function handleApplyCoupon() {
  if (!couponInput.trim()) return;
  const result = await validateCoupon.mutateAsync({
    code: couponInput,
    items: items.map(i => ({ productId: i.productId, quantity: i.quantity, extraIds: i.extras.map(e => e.id) })),
    deliveryType,
    customerPhone,
  });
  if (result.valid) {
    setCoupon(couponInput.toUpperCase(), result.calculatedDiscount);
  } else {
    clearCoupon();
    // Mostrar result.reason como erro
  }
}

// Recalcular total:
const totalAmount = subtotal - couponDiscount + effectiveFee;
```

### `use-checkout-page.ts` — Enviar couponCode

```typescript
const order = await createOrder.mutateAsync({
  // ... existente ...
  couponCode: couponCode || undefined,  // ← NOVO
});
```

### `checkout-client.tsx` — Breakdown de preço

```tsx
<div className="space-y-2 text-sm">
  <div className="flex justify-between">
    <span>Subtotal</span>
    <span>{formatCurrency(subtotal)}</span>
  </div>
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

### Nova página admin: `/admin/coupons`

```
app/admin/coupons/
├── page.tsx
├── loading.tsx
└── _components/
    ├── coupons-client.tsx
    ├── use-coupons-page.ts
    └── coupon-dialog.tsx   — Create/Edit form
```

### `admin/layout.tsx` — Novo nav item

"Cupons" → `/admin/coupons`

### Shared Types

```typescript
// packages/shared/src/types/coupon.ts
export interface CouponResponse {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  minQuantity: number;
  validFrom: string | null;
  validUntil: string | null;
  validDays: number[] | null;
  validTimeFrom: string | null;
  validTimeTo: string | null;
  maxUses: number;
  maxUsesPerCustomer: number;
  currentUses: number;
  firstOrderOnly: boolean;
  excludePromotional: boolean;
  deliveryTypeRestriction: string | null;
  applicableProductIds: string[] | null;
  applicableCategoryIds: string[] | null;
  applicableSectionIds: string[] | null;
  isActive: boolean;
  createdAt: string;
}

export interface ValidateCouponRequest {
  code: string;
  items: Array<{ productId: string; quantity: number; extraIds?: string[] }>;
  deliveryType: 'pickup' | 'delivery';
  customerPhone: string;
}

export interface ValidateCouponResponse {
  valid: boolean;
  code: string;
  discountType?: string;
  discountValue?: number;
  calculatedDiscount?: number;
  eligibleAmount?: number;
  message?: string;
  reason?: string;
}
```

### `CreateOrderDto` — Campo novo

```typescript
// packages/shared/src/types/order.ts
export interface CreateOrderDto {
  // ... existente ...
  couponCode?: string;  // ← NOVO
}
```

---

## Regras de Negócio

1. **Um cupom por pedido**: Simplifica lógica e evita stacking exploits. O campo `couponCode` no DTO é singular.

2. **Server-side é autoridade**: O frontend envia apenas o código. O backend recalcula o desconto na criação do pedido. Se o cupom ficou inválido entre o validate e o create, o pedido falha com erro descritivo.

3. **Código case-insensitive**: Armazenado e comparado em uppercase. "bemvindo10" = "BEMVINDO10".

4. **Race condition no currentUses**: O incremento usa UPDATE atômico com WHERE check (`current_uses < max_uses`). Se dois pedidos chegam ao mesmo tempo e o cupom tem 1 uso restante, apenas um consegue.

5. **Desconto nunca > valor elegível**: Se o cupom dá R$30 fixo mas o valor elegível é R$20, o desconto é R$20.

6. **Desconto sobre itens elegíveis, não sobre entrega**: A taxa de entrega nunca entra no cálculo do desconto. O cupom desconta do subtotal dos itens que passam nos filtros.

7. **Cupom + Promoção**: Com `excludePromotional: true`, itens com `promotionActive === true` são ignorados no cálculo. O desconto é aplicado apenas nos itens de preço cheio.

8. **Revalidação no checkout**: O `validate` endpoint é preview — o `create` do pedido re-executa toda a validação. Se algo mudou (cupom esgotou, horário passou), o pedido é rejeitado com mensagem clara.

9. **Snapshot no pedido**: `couponCode` e `discountAmount` são gravados no Order. Mesmo que o cupom seja editado/deletado depois, o histórico do pedido mantém o valor correto.

10. **`firstOrderOnly` e `maxUsesPerCustomer`**: Validam contra o Customer (lookup por phone). `firstOrderOnly` verifica se o customer já tem pedidos. `maxUsesPerCustomer` conta CouponUsages do customer para aquele cupom.

---

## Verificação

1. **Admin cria cupom**: Acessar `/admin/coupons` → criar cupom "TESTE10" → 10% → salvar
2. **Cliente aplica**: Carrinho → digitar "TESTE10" → ver desconto calculado → ver breakdown
3. **Cupom inválido**: Digitar código errado → mensagem "Cupom não encontrado"
4. **Valor mínimo**: Cupom com mínimo R$40 → carrinho R$30 → "Valor mínimo do pedido é R$40,00"
5. **Horário**: Cupom happy hour (14-17h) → testar fora do horário → mensagem descritiva
6. **Dia da semana**: Cupom segunda-a-quinta → testar no sábado → mensagem descritiva
7. **Tipo de entrega**: Cupom só delivery → selecionar retirada → mensagem
8. **excludePromotional**: Cupom + item em promoção → desconto aplicado apenas nos itens de preço cheio
9. **Race condition**: Cupom com maxUses=1 → dois pedidos simultâneos → apenas um sucede
10. **Pedido final**: Criar pedido com cupom → verificar Order.couponCode e discountAmount no banco
