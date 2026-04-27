# Feature 4: Produtos Promocionais

## Visão Geral

Permite que o admin defina preços promocionais temporários para produtos. O cliente vê o preço original riscado e o novo preço em destaque. O backend é a autoridade no preço efetivo — o frontend nunca envia preço.

**Por que existe**: Permitir que o restaurante faça promoções pontuais (ex: "Coxinha por R$3,99 só hoje") sem alterar o preço base do produto. Quando a promoção acaba, o preço volta automaticamente.

**Dependências**: Nenhuma — esta é a primeira feature a ser implementada.

---

## Fluxo do Usuário (Cliente)

1. Cliente abre o cardápio e vê produtos com badge "Promo"
2. No card do produto, o preço original aparece riscado e o preço promocional em destaque
   - Ex: ~~R$ 12,90~~ **R$ 8,90**
3. Ao abrir o detalhe do produto, mesma visualização de preço
4. Ao adicionar ao carrinho, o `unitPrice` já é o preço promocional
5. No checkout, o backend calcula o total usando `getEffectivePrice()` — o preço que vale é o do servidor

**Exemplo concreto**:
- Coxinha: preço base R$6,50, preço promocional R$3,99
- Promoção válida de 25/03 a 31/03
- Cliente acessa dia 27/03 → vê R$3,99 com badge "Promo"
- Cliente acessa dia 01/04 → vê R$6,50, sem badge

---

## Fluxo do Admin

1. Admin acessa **Produtos** → edita um produto existente
2. No dialog de edição, seção "Promoção":
   - Toggle "Produto em promoção" (`isPromotional`)
   - Campo "Preço promocional" (R$) — obrigatório quando toggle ativo
   - Campo "Data início" (opcional — null = já vale)
   - Campo "Data fim" (opcional — null = sem prazo)
3. Ao salvar, o backend atualiza os campos promocionais
4. Na lista de produtos do admin, produtos em promoção ativa aparecem com indicador visual

---

## Entidade do Banco

### Product — Campos Novos

| Campo | Tipo | Default | Notas |
|-------|------|---------|-------|
| `isPromotional` | boolean | `false` | Flag de promoção |
| `promotionalPrice` | decimal(10,2) | `null` | Preço promocional (nullable) |
| `promotionStartDate` | timestamptz | `null` | Início da promoção (nullable, null = imediato) |
| `promotionEndDate` | timestamptz | `null` | Fim da promoção (nullable, null = sem prazo) |

### Migration

```sql
ALTER TABLE products ADD COLUMN is_promotional boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN promotional_price decimal(10,2);
ALTER TABLE products ADD COLUMN promotion_start_date timestamptz;
ALTER TABLE products ADD COLUMN promotion_end_date timestamptz;
```

---

## Endpoints da API

### Endpoints Modificados

Nenhum endpoint novo — as alterações são nos endpoints existentes.

#### `GET /api/menu` — Resposta modificada

Cada produto agora inclui campos promocionais:

```json
{
  "id": "uuid",
  "name": "Coxinha",
  "price": 6.50,
  "isPromotional": true,
  "promotionalPrice": 3.99,
  "promotionActive": true,
  "effectivePrice": 3.99,
  "extras": [...]
}
```

- `promotionActive`: booleano calculado pelo backend (isPromotional + dentro das datas)
- `effectivePrice`: preço que o frontend deve exibir e usar no carrinho

#### `PUT /api/admin/products/:id` — Request modificado

Aceita novos campos opcionais:

```json
{
  "isPromotional": true,
  "promotionalPrice": 3.99,
  "promotionStartDate": "2026-03-25T00:00:00Z",
  "promotionEndDate": "2026-03-31T23:59:59Z"
}
```

#### `POST /api/orders` — Lógica modificada

O `OrdersService.create()` usa `getEffectivePrice()` ao invés de `product.price` diretamente.

---

## Backend — Implementação

### 1. Entity (product.entity.ts) — Novos campos

```typescript
@Property({ default: false })
isPromotional?: boolean = false;

@Property({ nullable: true, columnType: 'decimal(10,2)' })
promotionalPrice?: string;

@Property({ nullable: true })
promotionStartDate?: Date;

@Property({ nullable: true })
promotionEndDate?: Date;
```

### 2. Helper: `getEffectivePrice(product)`

Função pura, usada no `OrdersService`, `ProductsService`, e qualquer lugar que precise do preço real:

```typescript
function isPromotionActive(product: Product): boolean {
  if (!product.isPromotional || !product.promotionalPrice) return false;
  const now = new Date();
  if (product.promotionStartDate && now < product.promotionStartDate) return false;
  if (product.promotionEndDate && now > product.promotionEndDate) return false;
  return true;
}

function getEffectivePrice(product: Product): string {
  return isPromotionActive(product) ? product.promotionalPrice! : product.price;
}
```

### 3. ProductsService — `formatProduct()` modificado

Adiciona `promotionActive` e `effectivePrice` à resposta:

```typescript
private formatProduct(product: Product) {
  const promotionActive = isPromotionActive(product);
  return {
    ...existingFields,
    isPromotional: product.isPromotional ?? false,
    promotionalPrice: product.promotionalPrice ? parseFloat(product.promotionalPrice) : null,
    promotionActive,
    effectivePrice: parseFloat(getEffectivePrice(product)),
  };
}
```

### 4. OrdersService.create() — Preço efetivo

```typescript
// ANTES:
const unitPriceCents = Math.round(parseFloat(product.price) * 100) + extrasCents;

// DEPOIS:
const effectivePrice = getEffectivePrice(product);
const unitPriceCents = Math.round(parseFloat(effectivePrice) * 100) + extrasCents;
```

### 5. AdminService — Validação na criação/edição

```typescript
if (dto.isPromotional) {
  if (!dto.promotionalPrice || dto.promotionalPrice <= 0) {
    throw new BadRequestException('Preço promocional é obrigatório');
  }
  if (dto.promotionalPrice >= parseFloat(product.price)) {
    throw new BadRequestException('Preço promocional deve ser menor que o preço original');
  }
}
```

---

## Frontend — Implementação

### Shared Types — `Product` modificado

```typescript
// packages/shared/src/types/menu.ts
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  extras: ProductExtra[];
  // Novos campos (Feature 4)
  isPromotional: boolean;
  promotionalPrice: number | null;
  promotionActive: boolean;
  effectivePrice: number;
}
```

### Componentes Modificados

#### `product-card.tsx`

- Exibe badge "Promo" quando `promotionActive === true`
- Preço original riscado + preço promocional em destaque
- Usa `effectivePrice` para cálculos

```tsx
{product.promotionActive ? (
  <div className="mt-2.5 flex items-center gap-2">
    <span className="text-[0.8rem] text-terra-800/40 line-through">
      {formatCurrency(product.price)}
    </span>
    <span className="font-display text-[0.95rem] font-bold text-green-600">
      {formatCurrency(product.effectivePrice)}
    </span>
  </div>
) : (
  <div className="mt-2.5">
    <span className="font-display text-[0.95rem] font-bold text-terra-900">
      {formatCurrency(product.price)}
    </span>
  </div>
)}
```

Badge:
```tsx
{product.promotionActive && (
  <span className="absolute top-1 left-1 rounded-full bg-green-500 px-2 py-0.5 text-[0.6rem] font-bold text-white">
    Promo
  </span>
)}
```

#### `product-detail-dialog.tsx`

Mesma lógica de preço riscado + promocional.

#### `cart-store.ts`

O `addItem` já recebe `unitPrice` como parâmetro — quem chama deve passar `effectivePrice`:

```typescript
// Em home-client.tsx / product-detail-dialog.tsx:
addItem({
  productId: product.id,
  productName: product.name,
  unitPrice: product.effectivePrice, // ← usa effectivePrice
  extras: selectedExtras,
  imageUrl: product.imageUrl,
}, quantity);
```

O `hydrateItems` também precisa usar `effectivePrice` ao atualizar preços:

```typescript
hydrateItems: (freshProducts) =>
  set((state) => {
    const productMap = new Map(freshProducts.map((p) => [p.id, p]));
    // ...
    updated.push({
      ...item,
      unitPrice: fresh.effectivePrice, // ← effectivePrice
      // ...
    });
  }),
```

#### `products-client/product-dialog.tsx` (Admin)

Nova seção no formulário de edição de produto:

```
┌──────────────────────────────────────┐
│ Promoção                             │
│ ☐ Produto em promoção               │
│                                      │
│ [Se marcado:]                        │
│ Preço promocional: [______] R$       │
│ Data início: [__/__/____] (opcional) │
│ Data fim:    [__/__/____] (opcional) │
└──────────────────────────────────────┘
```

---

## Regras de Negócio

1. **Backend é autoridade no preço**: O frontend exibe `effectivePrice` mas nunca envia preço — o backend sempre recalcula usando `getEffectivePrice()`.

2. **Promoção ativa = 3 condições**: `isPromotional === true` AND `promotionalPrice !== null` AND dentro das datas (ou datas null).

3. **Preço promocional < preço original**: Validação no admin — não faz sentido "promoção" mais cara.

4. **Promoção expirada**: Produto volta a exibir preço normal automaticamente, sem ação do admin. O campo `isPromotional` fica `true` mas `promotionActive` retorna `false`.

5. **Cart hydration**: Quando o app recarrega, os preços do carrinho são atualizados com `effectivePrice` do servidor. Se uma promoção acabou entre a adição ao carrinho e o checkout, o preço atualiza automaticamente.

6. **OrderItem snapshot**: O `unitPrice` e `subtotal` do `OrderItem` são gravados no momento da criação. Mesmo que a promoção mude depois, o pedido mantém o preço que valia na hora.

7. **Interação com cupons (Feature 3)**: Cupons com `excludePromotional: true` não aplicam desconto em itens onde `promotionActive === true`. O cálculo do desconto pula esses itens.

---

## Verificação

1. **Admin cria promoção**: Editar produto → ativar promoção → definir preço → salvar
2. **Cliente vê promoção**: Acessar cardápio → ver badge "Promo" → preço riscado + novo
3. **Preço correto no carrinho**: Adicionar ao carrinho → `unitPrice` = preço promocional
4. **Backend calcula corretamente**: Criar pedido → `OrderItem.unitPrice` = preço promocional
5. **Promoção expira**: Alterar `promotionEndDate` para ontem → produto volta ao preço normal
6. **Hydration funciona**: Adicionar item promocional → fechar app → reabrir → preço atualizado
