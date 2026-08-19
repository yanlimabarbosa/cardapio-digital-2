# Bem Comer — 3 features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three admin/customer features for the Bem Comer ordering app: drag-to-reorder option groups, a configurable combined selection limit across option groups (e.g. Churrasco + Proteína = max 2 total), and auto-printing the receipt when an order reaches "pronto".

**Architecture:** Monorepo — NestJS API (hexagonal: entity → repo/port → use-case → controller) + Next.js 15 web + `@cardapio/shared`. MikroORM v6 (`whitelist:true` ValidationPipe strips undeclared DTO fields — every new request field MUST be added to its DTO). Realtime via socket.io `KitchenGateway` (namespace `kitchen`). Receipts are client-side `window.print()` pages, no fiscal backend.

**Tech Stack:** NestJS, MikroORM/Postgres, Next.js/React, TanStack Query, `@dnd-kit`, socket.io, Playwright.

## Global Constraints

- Never modify production `.env` files. Deploy = push from local clone (`gh` as `yanlimabarbosa`, HTTPS), then server `git fetch && git reset --hard origin/master`; server deploy key is read-only. Commit author: `Yan Lima Barbosa <yanbr763@gmail.com>`.
- MikroORM migration must be **non-destructive**: only `CREATE TABLE combined_limits` + `ADD COLUMN option_groups.combined_limit_id` (nullable). No data drops.
- `whitelist:true` is active: any new field on a request DTO that isn't decorated is silently stripped. Add + decorate every new DTO field.
- Reordering is **per-product** (only the groups of one product move together).
- F2 max per-group AND combined both apply; the tighter one binds.
- All user-facing copy in pt-BR, matching existing tone.
- Public menu read repo (`mikro-orm-menu.read-repository.ts`) already sorts option groups by `sortOrder` — F1 needs NO backend change; customer reflects new order automatically.

---

## File Structure

**F1 (admin-only, frontend):**
- Modify `apps/web/src/app/admin/products/_components/use-products-page.ts` — add `reorderOptionGroupsMutation` + `handleOptionGroupReorder`.
- Modify `apps/web/src/app/admin/products/_components/products-client/index.tsx` — wrap group list in DnD.
- Create `apps/web/src/app/admin/products/_components/products-client/sortable-option-group-row.tsx` — draggable group row.

**F2 (full stack):**
- Create `apps/api/src/entities/combined-limit.entity.ts`.
- Modify `apps/api/src/entities/option-group.entity.ts` — add `combinedLimit` FK.
- Modify `apps/api/src/entities/index.ts` — export new entity.
- Create migration `apps/api/src/migrations/MigrationYYYYMMDDHHMMSS_combined_limits.ts`.
- Create backend CRUD for CombinedLimit (mirror option-group CRUD): port, write-repo, read wiring, 3 use-cases, controller endpoints, DTOs.
- Modify `apps/api/src/modules/admin/dto/request/update-option-group.dto.ts` — add `combinedLimitId`.
- Modify order catalog port + repo + `order-item-snapshot.policy.ts` — thread + enforce combined limit.
- Modify menu read repo + read-model + `packages/shared/src/types/menu.ts` — expose combined limits to customer.
- Modify `apps/web/src/app/_components/product-detail-dialog.tsx` — client enforcement.
- Modify `apps/web/src/app/admin/products/_components/products-client/index.tsx` + `use-products-page.ts` — admin UI to manage combined limits.

**F3 (frontend + docs):**
- Create `apps/web/src/app/admin/orders/_components/use-auto-receipt-print.ts` — print hook.
- Modify `apps/web/src/app/admin/orders/_components/use-orders-page.ts` — pass socket payload through; expose print-station toggle state.
- Modify the orders board client to render the toggle.
- Modify `DEPLOY.md` — kiosk-printing ops setup.

**Tests:** extend `tests/features/bem-comer-features.spec.ts`.

---

## F1 — Drag-to-reorder option groups

### Task 1: Reorder mutation + handler in products page hook

**Files:**
- Modify: `apps/web/src/app/admin/products/_components/use-products-page.ts`

**Interfaces:**
- Consumes: existing `reorderProductsMutation` pattern already in this file (mirror it); endpoint `PATCH /api/admin/option-groups/reorder` with body `{ items: {id: string, sortOrder: number}[] }`; existing `adminFetch(path, token, opts)` and `queryClient`.
- Produces: `handleOptionGroupReorder(productId: string, orderedGroupIds: string[]): void` returned from the hook.

- [ ] **Step 1: Read the sibling pattern.** Open `use-products-page.ts` and locate the existing product reorder mutation (`reorderProductsMutation` + its handler using `@dnd-kit`'s `arrayMove`, optimistic `setQueryData`, then `.mutate`). Also open `apps/web/src/app/admin/categories/_components/use-categories-page.ts` `handleCategoryReorder` (lines ~104-119) as the reference shape.

- [ ] **Step 2: Add the mutation.** After the existing option-group mutations, add:

```ts
const reorderOptionGroupsMutation = useMutation({
  mutationFn: (items: { id: string; sortOrder: number }[]) =>
    adminFetch('/api/admin/option-groups/reorder', token, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  },
});
```

(Confirm the products query key — grep `queryKey:` in this file and use whatever the product list uses; replace `['admin-products']` accordingly.)

- [ ] **Step 3: Add the handler with optimistic update.**

```ts
function handleOptionGroupReorder(productId: string, orderedGroupIds: string[]) {
  const items = orderedGroupIds.map((id, index) => ({ id, sortOrder: index }));
  queryClient.setQueryData<Product[]>(['admin-products'], (old) =>
    old?.map((p) =>
      p.id !== productId
        ? p
        : {
            ...p,
            optionGroups: [...(p.optionGroups ?? [])].sort(
              (a, b) =>
                orderedGroupIds.indexOf(a.id) - orderedGroupIds.indexOf(b.id),
            ),
          },
    ),
  );
  reorderOptionGroupsMutation.mutate(items);
}
```

(Use the actual product type/query-key from this file. If products come from a nested `category.products` shape, adapt the `setQueryData` to that shape — grep how `reorderProductsMutation`'s optimistic update walks the cache and mirror it exactly.)

- [ ] **Step 4: Export from the hook.** Add `handleOptionGroupReorder` (and if the file returns mutations, `reorderOptionGroupsMutation`) to the hook's return object.

- [ ] **Step 5: Typecheck.**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 6: Commit.**

```bash
git add apps/web/src/app/admin/products/_components/use-products-page.ts
git commit -m "feat(admin): reorder option groups mutation + handler"
```

### Task 2: Sortable group row component

**Files:**
- Create: `apps/web/src/app/admin/products/_components/products-client/sortable-option-group-row.tsx`

**Interfaces:**
- Consumes: `@dnd-kit/sortable` `useSortable`, `@dnd-kit/utilities` `CSS`, `lucide-react` `GripVertical`. The existing group-row JSX from `products-client/index.tsx`.
- Produces: `SortableOptionGroupRow` — props `{ group: AdminOptionGroup; children: React.ReactNode }`. Renders a drag handle + `children` (the existing group row content), wired for sorting by `group.id`.

- [ ] **Step 1: Read the reference.** Open `apps/web/src/app/admin/categories/_components/categories-client/sortable-category-card.tsx` and copy its `useSortable` wiring shape (`attributes`, `listeners`, `setNodeRef`, `transform`, `transition`, `GripVertical` handle).

- [ ] **Step 2: Write the component.**

```tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

export function SortableOptionGroupRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="flex items-start gap-1"
    >
      <button
        type="button"
        className="mt-2 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        aria-label="Arrastar grupo"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
```

(Match Tailwind classes/spacing to the sibling category card so it looks consistent.)

- [ ] **Step 3: Typecheck.**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit.**

```bash
git add apps/web/src/app/admin/products/_components/products-client/sortable-option-group-row.tsx
git commit -m "feat(admin): sortable option group row"
```

### Task 3: Wire DnD into the option-groups panel

**Files:**
- Modify: `apps/web/src/app/admin/products/_components/products-client/index.tsx`

**Interfaces:**
- Consumes: `handleOptionGroupReorder` from Task 1; `SortableOptionGroupRow` from Task 2; `@dnd-kit/core` (`DndContext`, `closestCenter`, `PointerSensor`, `useSensor`, `useSensors`, `DragEndEvent`), `@dnd-kit/sortable` (`SortableContext`, `verticalListSortingStrategy`, `arrayMove`).

- [ ] **Step 1: Read current render.** Locate where `product.optionGroups.map(...)` renders each group row (around line 394) and the "Novo grupo" button (~383).

- [ ] **Step 2: Import DnD + sensors.** Add imports at top (mirror the products page's existing product DnD imports if already present in this file; otherwise add). Inside the component add:

```tsx
const groupSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
```

- [ ] **Step 3: Wrap the group list.** Replace the `product.optionGroups.map(group => <groupRowJSX/>)` with:

```tsx
<DndContext
  sensors={groupSensors}
  collisionDetection={closestCenter}
  onDragEnd={(e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = product.optionGroups.map((g) => g.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    handleOptionGroupReorder(product.id, next);
  }}
>
  <SortableContext items={product.optionGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
    {product.optionGroups.map((group) => (
      <SortableOptionGroupRow key={group.id} id={group.id}>
        {/* the EXISTING group row JSX, unchanged */}
      </SortableOptionGroupRow>
    ))}
  </SortableContext>
</DndContext>
```

Keep the existing per-group JSX (name, badges, edit/toggle/delete actions) as the `children` — do not rewrite it.

- [ ] **Step 4: Pull `handleOptionGroupReorder` from the hook** where this component consumes `useProductsPage()` (or via props if the component receives handlers as props — match how `handleProductReorder`/existing handlers arrive here).

- [ ] **Step 5: Manual smoke + typecheck.**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit.**

```bash
git add apps/web/src/app/admin/products/_components/products-client/index.tsx
git commit -m "feat(admin): drag-to-reorder option groups panel"
```

### Task 4: E2E — reorder persists

**Files:**
- Modify: `tests/features/bem-comer-features.spec.ts`

- [ ] **Step 1: Write the test.** Append inside the `describe`:

```ts
test('admin: reordenar grupos de opções persiste após reload', async ({ page }) => {
  await uiLogin(page);
  await page.goto('/admin/products');
  // Expandir a Quentinha M (produto composto com múltiplos grupos)
  // NOTE: ajustar seletores aos data-testid reais; se não existirem, adicioná-los
  // no index.tsx (ex: data-testid={`product-${product.id}`}, `group-row-${group.id}`).
  const product = page.getByTestId(/product-.*/).filter({ hasText: 'Quentinha M' }).first();
  await product.getByRole('button', { name: /Expandir|Recolher|grupos/i }).first().click();

  const handles = page.getByLabel('Arrastar grupo');
  const firstBefore = await page.getByTestId(/group-row-/).first().innerText();

  // arrasta o primeiro grupo para depois do segundo
  const first = handles.nth(0);
  const second = handles.nth(1);
  const fb = await first.boundingBox();
  const sb = await second.boundingBox();
  await page.mouse.move(fb!.x + 4, fb!.y + 4);
  await page.mouse.down();
  await page.mouse.move(sb!.x + 4, sb!.y + 20, { steps: 8 });
  await page.mouse.up();

  await page.waitForResponse(
    (r) => r.url().includes('/api/admin/option-groups/reorder') && r.request().method() === 'PATCH',
  );
  await page.reload();
  await expect(page.getByTestId(/group-row-/).first()).not.toHaveText(firstBefore);
});
```

- [ ] **Step 2: Add any missing `data-testid`s** referenced above to `products-client/index.tsx` (`product-<id>`, `group-row-<id>`), commit them with the test.

- [ ] **Step 3: Run.**

Run: `pnpm exec playwright test tests/features/bem-comer-features.spec.ts -g "reordenar grupos"`
Expected: PASS (drag reflow + persistence after reload).

- [ ] **Step 4: Commit.**

```bash
git add tests/features/bem-comer-features.spec.ts apps/web/src/app/admin/products/_components/products-client/index.tsx
git commit -m "test(e2e): option group reorder persists"
```

---

## F2 — Combined selection limit across groups

### Task 5: CombinedLimit entity + OptionGroup FK + migration

**Files:**
- Create: `apps/api/src/entities/combined-limit.entity.ts`
- Modify: `apps/api/src/entities/option-group.entity.ts`
- Modify: `apps/api/src/entities/index.ts`
- Create: `apps/api/src/migrations/Migration<timestamp>_combined_limits.ts`

**Interfaces:**
- Produces: entity `CombinedLimit { id: string; product: Product; name: string; maxSelections: number; isArchived: boolean }`; `OptionGroup.combinedLimit?: CombinedLimit` (nullable ManyToOne, FK column `combined_limit_id`).

- [ ] **Step 1: Create the entity** (mirror `option-group.entity.ts` conventions):

```ts
import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { Product } from './product.entity';
import { OptionGroup } from './option-group.entity';

@Entity({ tableName: 'combined_limits' })
export class CombinedLimit {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Product)
  product!: Product;

  @Property()
  name!: string;

  @Property({ default: 1 })
  maxSelections?: number = 1;

  @Property({ default: false })
  isArchived?: boolean = false;

  @OneToMany(() => OptionGroup, (group) => group.combinedLimit)
  groups = new Collection<OptionGroup>(this);

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
```

- [ ] **Step 2: Add the FK to OptionGroup.** In `option-group.entity.ts`, add the import and property (nullable):

```ts
import { CombinedLimit } from './combined-limit.entity';
// ...inside the class, after isArchived:
  @ManyToOne(() => CombinedLimit, { nullable: true })
  combinedLimit?: CombinedLimit | null;
```

- [ ] **Step 3: Export** `CombinedLimit` from `apps/api/src/entities/index.ts` (add the re-export line matching the file's style).

- [ ] **Step 4: Generate the migration.**

Run: `pnpm --filter api exec mikro-orm migration:create`
Expected: a new migration file referencing `combined_limits` + `option_groups.combined_limit_id`.

- [ ] **Step 5: Verify the migration is non-destructive.** Open the generated file. It MUST only `create table "combined_limits"` and `alter table "option_groups" add column "combined_limit_id"` (+ FK constraint). If it contains any `drop`, stop and hand-fix. Expected `up()` SQL shape:

```sql
create table "combined_limits" ("id" uuid not null default gen_random_uuid(), "product_id" uuid not null, "name" varchar(255) not null, "max_selections" int not null default 1, "is_archived" boolean not null default false, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "combined_limits_pkey" primary key ("id"));
alter table "combined_limits" add constraint "combined_limits_product_id_foreign" foreign key ("product_id") references "products" ("id") on update cascade;
alter table "option_groups" add column "combined_limit_id" uuid null;
alter table "option_groups" add constraint "option_groups_combined_limit_id_foreign" foreign key ("combined_limit_id") references "combined_limits" ("id") on update cascade on delete set null;
```

- [ ] **Step 6: Apply locally + verify.**

Run: `pnpm --filter api exec mikro-orm migration:up`
Then: `docker exec cardapio-digital-2-postgres-1 psql -U postgres -d cardapio_digital_2 -c "\d combined_limits" -c "\d option_groups"`
Expected: `combined_limits` exists; `option_groups.combined_limit_id` column present, nullable.

- [ ] **Step 7: Commit.**

```bash
git add apps/api/src/entities apps/api/src/migrations
git commit -m "feat(api): CombinedLimit entity + option_groups FK + migration"
```

### Task 6: CombinedLimit backend CRUD (mirror option-group CRUD)

**Files (create, mirroring the option-group equivalents):**
- Port: `apps/api/src/modules/admin/application/ports/admin-combined-limit-write.repository.port.ts`
- Repo: `apps/api/src/modules/admin/adapters/persistence/mikro-orm-admin-combined-limit-write.repository.ts`
- Use-cases: `create-admin-combined-limit.use-case.ts`, `update-admin-combined-limit.use-case.ts`, `delete-admin-combined-limit.use-case.ts` (under `.../application/use-cases/`)
- DTOs: `create-combined-limit.dto.ts`, `update-combined-limit.dto.ts` (under `.../admin/dto/request/`)
- Modify: `apps/api/src/modules/admin/admin.controller.ts`, `apps/api/src/modules/admin/admin.module.ts`
- Modify: `apps/api/src/modules/admin/dto/request/update-option-group.dto.ts`

**Interfaces:**
- Produces REST:
  - `POST /api/admin/products/:productId/combined-limits` body `{ name: string; maxSelections: number }` → `{ id, name, maxSelections }`
  - `PATCH /api/admin/combined-limits/:id` body `{ name?: string; maxSelections?: number }`
  - `DELETE /api/admin/combined-limits/:id` (soft: `isArchived = true`)
  - Group assignment reuses `PATCH /api/admin/option-groups/:id` with new field `combinedLimitId?: string | null`.

- [ ] **Step 1: Read the option-group CRUD** to mirror exactly: `create-admin-option-group.use-case.ts`, `update-admin-option-group.use-case.ts`, `delete-admin-option-group.use-case.ts`, `mikro-orm-admin-option-group-write.repository.ts`, `admin-option-group-write.repository.port.ts`, and their controller endpoints + `admin.module.ts` provider wiring. Replicate that structure for `CombinedLimit`, s/OptionGroup/CombinedLimit/, dropping `min/maxSelections`→keep only `name` + `maxSelections`, no `sortOrder`, no `options`.

- [ ] **Step 2: Write the create DTO:**

```ts
import { IsString, IsInt, Min, MinLength } from 'class-validator';

export class CreateCombinedLimitDto {
  @IsString()
  @MinLength(1)
  declare public readonly name: string;

  @IsInt()
  @Min(1)
  declare public readonly maxSelections: number;
}
```

- [ ] **Step 3: Write the update DTO** (all optional): `name?` (`@IsOptional @IsString @MinLength(1)`), `maxSelections?` (`@IsOptional @IsInt @Min(1)`).

- [ ] **Step 4: Add `combinedLimitId` to `UpdateOptionGroupDto`:**

```ts
  /** Combined-limit this group belongs to (null detaches it). */
  @IsOptional()
  @IsUUID()
  public readonly combinedLimitId?: string | null;
```

Add `IsUUID` to the `class-validator` import. In `update-admin-option-group.use-case.ts` + write repo, when `combinedLimitId` is present, set `optionGroup.combinedLimit = ref` (load `CombinedLimit` by id, or `null` when explicitly null). Mirror how the repo sets other scalar fields.

- [ ] **Step 5: Write the 3 use-cases + port + repo** for CombinedLimit CRUD, mirroring the option-group ones (create appends under product; update patches name/max; delete sets `isArchived = true`). Wire all providers in `admin.module.ts` (mirror the option-group provider block).

- [ ] **Step 6: Add controller endpoints** in `admin.controller.ts` mirroring the option-group create/update/delete endpoints, with the routes from the Interfaces block. Reuse existing auth guards/decorators used by neighboring admin endpoints.

- [ ] **Step 7: Build the API.**

Run: `pnpm --filter api exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Integration smoke** (api running locally on :3334, admin token via `apiLogin`): create a limit, patch a group's `combinedLimitId`, GET admin product, confirm the limit + assignment round-trip. (Can be a scratch curl or folded into Task 9's read exposure test.)

- [ ] **Step 9: Commit.**

```bash
git add apps/api/src/modules/admin
git commit -m "feat(api): CombinedLimit admin CRUD + option-group assignment"
```

### Task 7: Expose combined limits in admin product read

**Files:**
- Modify: `apps/api/src/modules/admin/application/read-models/admin-product.read-model.ts`
- Modify: `apps/api/src/modules/admin/application/read-models/admin-option-group.read-model.ts`
- Modify: `apps/api/src/modules/admin/adapters/persistence/mikro-orm-admin-product.read-repository.ts`
- Modify: `apps/api/src/modules/admin/admin-product.mapper.ts`
- Modify: `apps/api/src/modules/admin/dto/response/admin-product-response.dto.ts`
- Modify: `apps/web/src/types/admin.ts`

**Interfaces:**
- Produces: admin product JSON gains `combinedLimits: { id: string; name: string; maxSelections: number }[]`; each option group gains `combinedLimitId: string | null`.

- [ ] **Step 1: Read** the admin product read repo/mapper to see how `optionGroups` are assembled (the `compareOptionGroups` sort + map). Add `combinedLimits` (populate `product.combinedLimits` filtered `!isArchived`) and set `combinedLimitId: group.combinedLimit?.id ?? null` on each group. Populate `optionGroups.combinedLimit` in the `em.find`/`populate`.

- [ ] **Step 2: Extend the read-models + response DTO + web `AdminOptionGroup`/`AdminProduct` types** with the two new fields.

- [ ] **Step 3: Build.**

Run: `pnpm --filter api exec tsc --noEmit && pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify round-trip** via GET `/api/admin/products` — the product with a limit shows `combinedLimits` + a group with matching `combinedLimitId`.

- [ ] **Step 5: Commit.**

```bash
git add apps/api/src/modules/admin apps/web/src/types/admin.ts
git commit -m "feat(api): expose combinedLimits in admin product read"
```

### Task 8: Server-side enforcement in order snapshot policy

**Files:**
- Modify: `apps/api/src/modules/orders/domain/order-item-snapshot.policy.ts`
- Modify: `apps/api/src/modules/orders/application/ports/order-product-catalog.port.ts`
- Modify: `apps/api/src/modules/orders/adapters/persistence/mikro-orm-order-product-catalog.repository.ts`
- Test: `apps/api/src/modules/orders/domain/order-item-snapshot.policy.spec.ts` (create if absent)

**Interfaces:**
- Consumes: `OrderItemSnapshotOptionGroupInput` gains `combinedLimitId?: string | null`; `OrderItemSnapshotProductInput` gains `combinedLimits?: readonly { id: string; maxSelections: number; name: string }[]`.
- Produces: `createSnapshot()` throws `InvalidOrderItemSnapshotError` when the summed selections across groups sharing a `combinedLimitId` exceed that limit's `maxSelections`.

- [ ] **Step 1: Write the failing test.** Create `order-item-snapshot.policy.spec.ts`:

```ts
import { OrderItemSnapshotPolicy, InvalidOrderItemSnapshotError } from './order-item-snapshot.policy';

const product = {
  id: 'p1', name: 'Quentinha M', baseUnitPriceCents: 2500, isActive: true, isCompound: true, extras: [],
  combinedLimits: [{ id: 'cl1', name: 'Carnes', maxSelections: 2 }],
  optionGroups: [
    { id: 'g-prot', name: 'Proteína', isActive: true, minSelections: 0, maxSelections: 2, combinedLimitId: 'cl1',
      options: [{ id: 'o1', name: 'Frango', price: '0', isActive: true }, { id: 'o2', name: 'Carne', price: '0', isActive: true }] },
    { id: 'g-chur', name: 'Churrasco', isActive: true, minSelections: 0, maxSelections: 2, combinedLimitId: 'cl1',
      options: [{ id: 'o3', name: 'Picanha', price: '0', isActive: true }, { id: 'o4', name: 'Linguiça', price: '0', isActive: true }] },
  ],
};

test('combined limit: 2 proteínas + 1 churrasco excede o teto de 2 carnes', () => {
  const policy = OrderItemSnapshotPolicy.for(product as any, {
    quantity: 1,
    optionSelections: [
      { groupId: 'g-prot', optionIds: ['o1', 'o2'] },
      { groupId: 'g-chur', optionIds: ['o3'] },
    ],
  });
  expect(() => policy.createSnapshot()).toThrow(InvalidOrderItemSnapshotError);
});

test('combined limit: 1 proteína + 1 churrasco é permitido', () => {
  const policy = OrderItemSnapshotPolicy.for(product as any, {
    quantity: 1,
    optionSelections: [
      { groupId: 'g-prot', optionIds: ['o1'] },
      { groupId: 'g-chur', optionIds: ['o3'] },
    ],
  });
  expect(() => policy.createSnapshot()).not.toThrow();
});
```

- [ ] **Step 2: Run — verify it fails.**

Run: `pnpm --filter api exec jest order-item-snapshot.policy`
Expected: FAIL (limit not enforced yet — first test does not throw).

- [ ] **Step 3: Add the input fields.** In the policy's type block: add `readonly combinedLimitId?: string | null;` to `OrderItemSnapshotOptionGroupInput`, and `readonly combinedLimits?: readonly { readonly id: string; readonly maxSelections: number; readonly name: string }[];` to `OrderItemSnapshotProductInput`.

- [ ] **Step 4: Enforce.** In `resolveCompoundSelection`, after the per-group loop (before `assertRequiredCompoundGroupsSelected`), add:

```ts
this.assertCombinedLimits(optionSelections);
```

And add the method:

```ts
private assertCombinedLimits(
  optionSelections: readonly OrderItemOptionSelectionInput[],
): void {
  const limits = this.product.combinedLimits ?? [];
  if (limits.length === 0) return;

  const countByLimit = new Map<string, number>();
  for (const selection of optionSelections) {
    const group = this.product.optionGroups.find((g) => g.id === selection.groupId);
    const limitId = group?.combinedLimitId;
    if (!limitId) continue;
    countByLimit.set(limitId, (countByLimit.get(limitId) ?? 0) + selection.optionIds.length);
  }

  for (const limit of limits) {
    const total = countByLimit.get(limit.id) ?? 0;
    const max = limit.maxSelections ?? 1;
    if (total > max) {
      throw new InvalidOrderItemSnapshotError(
        `"${limit.name}" permite no maximo ${max} no total`,
      );
    }
  }
}
```

- [ ] **Step 5: Thread the data through the catalog.** In `order-product-catalog.port.ts`, add `combinedLimitId` to the option-group model and `combinedLimits` to the orderable product model. In `mikro-orm-order-product-catalog.repository.ts`: add `'combinedLimits'` and `'optionGroups.combinedLimit'` to the composition `populate`; map `combinedLimits: product.combinedLimits.getItems().filter(l => !l.isArchived).map(l => ({ id: l.id, name: l.name, maxSelections: l.maxSelections }))` and `combinedLimitId: group.combinedLimit?.id ?? null` on each group. Ensure `create-order.use-case.ts` passes `combinedLimits` into the snapshot product input (grep where it builds `OrderItemSnapshotProductInput` and add the field).

- [ ] **Step 6: Run — verify pass.**

Run: `pnpm --filter api exec jest order-item-snapshot.policy && pnpm --filter api exec tsc --noEmit`
Expected: both policy tests PASS, no type errors.

- [ ] **Step 7: Commit.**

```bash
git add apps/api/src/modules/orders
git commit -m "feat(api): enforce combined selection limit on order creation"
```

### Task 9: Expose combined limits to the customer menu

**Files:**
- Modify: `packages/shared/src/types/menu.ts`
- Modify: `apps/api/src/modules/menu/application/read-models/product.read-model.ts`
- Modify: `apps/api/src/modules/menu/adapters/persistence/mikro-orm-menu.read-repository.ts`

**Interfaces:**
- Produces: public menu `Product` gains `combinedLimits?: { id: string; name: string; maxSelections: number }[]`; each `OptionGroup` gains `combinedLimitId?: string`.

- [ ] **Step 1: Shared types.** In `packages/shared/src/types/menu.ts`: add `combinedLimitId?: string;` to `OptionGroup`; add `export interface CombinedLimit { id: string; name: string; maxSelections: number }`; add `combinedLimits?: CombinedLimit[];` to `Product`.

- [ ] **Step 2: Read-model.** Add `combinedLimitId?: string` to `ProductOptionGroupReadModel`; add `combinedLimits?: readonly { id: string; name: string; maxSelections: number }[]` to `ProductReadModel`.

- [ ] **Step 3: Menu read repo.** Add `'products.optionGroups.combinedLimit'` and `'products.combinedLimits'` to the `populate` (line ~33). In `toOptionGroups`, set `combinedLimitId: group.combinedLimit?.id` on each mapped group. In the product mapper (`toProduct`/line ~131), add `combinedLimits: product.combinedLimits.getItems().filter(l => !l.isArchived).map(l => ({ id: l.id, name: l.name, maxSelections: l.maxSelections }))` (only when compound). Also add to the single-product populate paths (lines ~46, ~61).

- [ ] **Step 4: Build shared + api + web.**

Run: `pnpm --filter @cardapio/shared build && pnpm --filter api exec tsc --noEmit && pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify** GET public menu returns `combinedLimits` + group `combinedLimitId` for the compound product.

- [ ] **Step 6: Commit.**

```bash
git add packages/shared apps/api/src/modules/menu
git commit -m "feat: expose combined limits in public menu"
```

### Task 10: Client-side enforcement in product dialog

**Files:**
- Modify: `apps/web/src/app/_components/product-detail-dialog.tsx`

**Interfaces:**
- Consumes: `product.combinedLimits` + `group.combinedLimitId` from Task 9.

- [ ] **Step 1: Compute per-limit counts.** Inside the component, after `groupSelections` is available, add a memo:

```ts
const combinedCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  if (!product?.optionGroups) return counts;
  for (const g of product.optionGroups) {
    if (!g.combinedLimitId) continue;
    counts[g.combinedLimitId] = (counts[g.combinedLimitId] ?? 0) + (groupSelections[g.id]?.length ?? 0);
  }
  return counts;
}, [product, groupSelections]);

const combinedMaxById = useMemo(() => {
  const m: Record<string, number> = {};
  for (const l of product?.combinedLimits ?? []) m[l.id] = l.maxSelections;
  return m;
}, [product]);
```

- [ ] **Step 2: Guard selection in `toggleGroupOption`.** In the `else if (current.length < group.maxSelections)` branch, also require the combined limit has room. Replace the add branch condition:

```ts
} else {
  const limitId = group.combinedLimitId;
  const combinedRoom =
    !limitId || (combinedCounts[limitId] ?? 0) < (combinedMaxById[limitId] ?? Infinity);
  if (current.length < group.maxSelections && combinedRoom) {
    nextSelection = [...current, optionId];
  }
}
```

(Keep the `group.maxSelections === 1` single-choice branch above unchanged.)

- [ ] **Step 3: Disable options when combined is full.** In the option render, extend `isMaxed`:

```ts
const limitId = group.combinedLimitId;
const combinedMaxed =
  !!limitId && (combinedCounts[limitId] ?? 0) >= (combinedMaxById[limitId] ?? Infinity);
const isMaxed = selected.length >= group.maxSelections || combinedMaxed;
```

(`isMaxed` is currently computed once per group above the options map — move/extend it so `combinedMaxed` is in scope; recompute per render since it depends on the shared count.)

- [ ] **Step 4: Show a combined counter.** For a group with a `combinedLimitId`, render a small badge near the group header, e.g.:

```tsx
{group.combinedLimitId && combinedMaxById[group.combinedLimitId] != null && (
  <span className="text-xs font-semibold text-[#4A2810]">
    {product.combinedLimits!.find((l) => l.id === group.combinedLimitId)?.name}{' '}
    {combinedCounts[group.combinedLimitId] ?? 0}/{combinedMaxById[group.combinedLimitId]}
  </span>
)}
```

- [ ] **Step 5: Typecheck.**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit.**

```bash
git add apps/web/src/app/_components/product-detail-dialog.tsx
git commit -m "feat(web): enforce combined selection limit in product dialog"
```

### Task 11: Admin UI to manage combined limits

**Files:**
- Modify: `apps/web/src/app/admin/products/_components/products-client/index.tsx`
- Modify: `apps/web/src/app/admin/products/_components/use-products-page.ts`

**Interfaces:**
- Consumes: endpoints from Task 6; `combinedLimits` + group `combinedLimitId` from Task 7.
- Produces: hook handlers `createCombinedLimit(productId, {name, maxSelections})`, `updateCombinedLimit(id, patch)`, `deleteCombinedLimit(id)`, and reuse the existing group-update mutation to set `combinedLimitId`.

- [ ] **Step 1: Add mutations** in `use-products-page.ts` mirroring the option-group create/update/delete mutations, hitting the Task 6 routes; invalidate the products query on settle. Add a helper to update a group's `combinedLimitId` (reuse existing group-update mutation — pass `{ combinedLimitId }`).

- [ ] **Step 2: Render a "Limites combinados" subsection** in the product's option-groups panel (`index.tsx`): list existing `product.combinedLimits` (name + `máx N`) with edit/delete; an "Adicionar limite" control (name + number). Keep styling consistent with the existing group panel. No DnD here.

- [ ] **Step 3: Add a per-group "Limite combinado" selector** in each group row: a `<select>` with `Nenhum` + each `product.combinedLimits`; onChange calls the group-update helper with `combinedLimitId` (or `null` for Nenhum). Add `data-testid={`group-combined-select-${group.id}`}`.

- [ ] **Step 4: Typecheck + manual smoke.**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/app/admin/products/_components
git commit -m "feat(admin): manage combined limits + assign groups"
```

### Task 12: E2E — combined limit blocks the 3rd meat

**Files:**
- Modify: `tests/features/bem-comer-features.spec.ts`

- [ ] **Step 1: Write the test.** Seed via API: create a compound product's combined limit "Carnes" max 2, assign 2 groups, then drive the customer dialog. Simpler + robust variant — assert the SERVER rejects an over-limit order (mirrors the policy) and the client disables:

```ts
test('limite combinado: 3ª carne bloqueada (server 400)', async ({ request }) => {
  const api = await pwRequest.newContext();
  const token = await apiLogin(api);
  // localizar produto composto Quentinha M
  const products = await (await api.get(`${API}/api/admin/products`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  const m = (products as any[]).find((p) => p.isCompound && /Quentinha M/i.test(p.name));
  expect(m, 'produto composto Quentinha M deve existir no seed').toBeTruthy();

  // criar limite "Carnes" máx 2 e vincular Proteína + Churrasco
  const limit = await (await api.post(`${API}/api/admin/products/${m.id}/combined-limits`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Carnes', maxSelections: 2 },
  })).json();
  const prot = m.optionGroups.find((g: any) => /prote/i.test(g.name));
  const chur = m.optionGroups.find((g: any) => /churrasco/i.test(g.name));
  for (const g of [prot, chur]) {
    await api.patch(`${API}/api/admin/option-groups/${g.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { combinedLimitId: limit.id },
    });
  }

  // pedido com 2 proteínas + 1 churrasco = 3 carnes → deve falhar
  await setForceOpen(api, token, true);
  const res = await api.post(`${API}/api/orders`, {
    data: {
      customerName: 'E2E Carnes', customerPhone: '83988887777',
      deliveryType: 'pickup', paymentMethod: 'cash',
      items: [{
        productId: m.id, quantity: 1,
        optionSelections: [
          { groupId: prot.id, optionIds: prot.options.slice(0, 2).map((o: any) => o.id) },
          { groupId: chur.id, optionIds: [chur.options[0].id] },
        ],
      }],
    },
  });
  expect(res.status(), 'pedido com 3 carnes deve ser rejeitado').toBe(400);

  // cleanup: desvincula + arquiva limite
  for (const g of [prot, chur]) {
    await api.patch(`${API}/api/admin/option-groups/${g.id}`, {
      headers: { Authorization: `Bearer ${token}` }, data: { combinedLimitId: null },
    });
  }
  await api.delete(`${API}/api/admin/combined-limits/${limit.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await api.dispose();
});
```

(Adjust `optionSelections` field name to match `CreateOrderDto` — it uses `{ groupId, optionIds }`. Confirm items carry `optionSelections`; grep `create-order.dto.ts`.)

- [ ] **Step 2: Run.**

Run: `pnpm exec playwright test tests/features/bem-comer-features.spec.ts -g "limite combinado"`
Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add tests/features/bem-comer-features.spec.ts
git commit -m "test(e2e): combined limit rejects over-limit order"
```

---

## F3 — Auto-print receipt on "pronto"

### Task 13: Print-station toggle + auto-print hook

**Files:**
- Create: `apps/web/src/app/admin/orders/_components/use-auto-receipt-print.ts`
- Modify: `apps/web/src/app/admin/orders/_components/use-orders-page.ts`

**Interfaces:**
- Consumes: socket `WS_EVENTS.ORDER_STATUS_CHANGED` payload `{ id: string; status: string; updatedAt: string }` (emitted by `KitchenGateway.emitOrderStatusChanged`).
- Produces: `useAutoReceiptPrint()` → `{ enabled: boolean; setEnabled(v: boolean): void; printReceipt(orderId: string): void }`; and `use-orders-page.ts` calls `printReceipt` from the status-changed socket handler when `payload.status === 'ready'` and `enabled`.

- [ ] **Step 1: Write the hook.**

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'bemcomer.printStation';
const IFRAME_ID = 'bemcomer-receipt-print-frame';

export function useAutoReceiptPrint() {
  const [enabled, setEnabledState] = useState(false);
  const printedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setEnabledState(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  }, []);

  const printReceipt = useCallback((orderId: string) => {
    if (printedRef.current.has(orderId)) return;
    printedRef.current.add(orderId);

    let frame = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = IFRAME_ID;
      frame.style.position = 'fixed';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      frame.style.visibility = 'hidden';
      document.body.appendChild(frame);
    }
    frame.onload = () => {
      // With Chrome --kiosk-printing this prints silently to the default printer.
      frame!.contentWindow?.focus();
      frame!.contentWindow?.print();
    };
    frame.src = `/receipt/${orderId}?autoprint=1`;
  }, []);

  return { enabled, setEnabled, printReceipt };
}
```

- [ ] **Step 2: Wire into the orders page hook.** In `use-orders-page.ts`, import and call `useAutoReceiptPrint()`; change the socket handler to consume the payload:

```ts
const autoPrint = useAutoReceiptPrint();
// ...inside useEffect socket setup, replace the ORDER_STATUS_CHANGED handler:
socket.on(WS_EVENTS.ORDER_STATUS_CHANGED, (payload: { id: string; status: string }) => {
  queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  if (payload?.status === 'ready' && autoPrint.enabled) {
    autoPrint.printReceipt(payload.id);
  }
});
```

Add `autoPrint.enabled` and `autoPrint` to the effect deps. Return `autoPrint` (as `printStation`) from `useOrdersPage`.

- [ ] **Step 3: Verify the WS payload shape.** Grep `emitOrderStatusChanged` in `apps/api/src/modules/websocket/websocket.gateway.ts` — confirm it emits `{ id, status, updatedAt }`. If the field is named differently, adjust the handler.

- [ ] **Step 4: Typecheck.**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/app/admin/orders/_components/use-auto-receipt-print.ts apps/web/src/app/admin/orders/_components/use-orders-page.ts
git commit -m "feat(admin): auto-print receipt hook + kiosk print on ready"
```

### Task 14: Print-station toggle UI on the orders board

**Files:**
- Modify: the orders board client that consumes `useOrdersPage()` (`apps/web/src/app/admin/orders/_components/orders-client/index.tsx`)

**Interfaces:**
- Consumes: `printStation: { enabled, setEnabled }` returned from `useOrdersPage()`.

- [ ] **Step 1: Read** where the board renders its header/toolbar (grep for the page title or the kanban columns container).

- [ ] **Step 2: Add a toggle** in the board header:

```tsx
<label className="flex items-center gap-2 text-sm text-gray-600" data-testid="print-station-toggle">
  <input
    type="checkbox"
    checked={printStation.enabled}
    onChange={(e) => printStation.setEnabled(e.target.checked)}
  />
  Estação de impressão (auto-comprovante)
</label>
```

Pull `printStation` from the hook where the component reads `useOrdersPage()`.

- [ ] **Step 3: Typecheck + smoke.**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit.**

```bash
git add apps/web/src/app/admin/orders/_components/orders-client/index.tsx
git commit -m "feat(admin): print-station toggle on orders board"
```

### Task 15: E2E — auto-print fires on ready only when enabled

**Files:**
- Modify: `tests/features/bem-comer-features.spec.ts`

**Interfaces:**
- Consumes: toggle `data-testid="print-station-toggle"`; the hidden print iframe.

- [ ] **Step 1: Write the test.** Stub the iframe's `print` by intercepting `/receipt/*` navigation isn't trivial; instead assert the iframe gets created + navigated when enabled, and NOT when disabled. Use a `window.print` spy installed on the receipt route via `page.addInitScript`, and detect the print call through a console marker.

```ts
test('auto-comprovante: imprime no ready só com estação ligada', async ({ page, context }) => {
  const api = await pwRequest.newContext();
  const token = await apiLogin(api);
  await api.post(`${API}/api/admin/system/clear-data`, { headers: { Authorization: `Bearer ${token}` } });

  // marca window.print em qualquer página (inclui o iframe do /receipt)
  await context.addInitScript(() => {
    const orig = window.print;
    window.print = () => { console.log('__PRINT_CALLED__'); try { orig(); } catch {} };
  });

  await uiLogin(page);
  await page.goto('/admin/orders');
  await page.getByTestId('print-station-toggle').locator('input').check();

  const printed = page.waitForEvent('console', { predicate: (m) => m.text().includes('__PRINT_CALLED__'), timeout: 15000 });

  // cria pedido pickup e leva até ready → socket dispara auto-print
  const orderId = await createPickupOrder(api);
  await setOrderStatus(api, token, orderId, 'preparing');
  await setOrderStatus(api, token, orderId, 'ready');

  await printed; // se não imprimir, o teste falha por timeout
  await api.post(`${API}/api/admin/system/clear-data`, { headers: { Authorization: `Bearer ${token}` } });
  await api.dispose();
});
```

(If `console` capture inside a same-origin iframe proves flaky in CI, fall back to asserting the iframe element `#bemcomer-receipt-print-frame` exists with `src` containing the orderId via `expect.poll(() => page.locator('#bemcomer-receipt-print-frame').getAttribute('src'))`.)

- [ ] **Step 2: Run.**

Run: `pnpm exec playwright test tests/features/bem-comer-features.spec.ts -g "auto-comprovante"`
Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add tests/features/bem-comer-features.spec.ts
git commit -m "test(e2e): auto-print receipt on ready when station enabled"
```

### Task 16: Document kiosk-printing ops setup

**Files:**
- Modify: `DEPLOY.md` (create if missing, at repo root)

- [ ] **Step 1: Add a "Estação de impressão (auto-comprovante)" section** documenting: (1) set the thermal printer as the OS default; (2) launch Chrome on the counter PC with `--kiosk-printing` (e.g. `google-chrome --kiosk-printing https://cardapiobemcomer.com.br/admin/orders`); (3) log in, open the orders board, enable the "Estação de impressão" toggle; (4) note that only tabs with the toggle ON print, and that print happens once per order on the `ready` transition.

- [ ] **Step 2: Commit.**

```bash
git add DEPLOY.md
git commit -m "docs: kiosk-printing setup for auto-receipt station"
```

---

## Final: full test run + deploy

### Task 17: Run the whole suite

- [ ] **Step 1: Build shared + run all feature E2E.**

Run: `pnpm --filter @cardapio/shared build && pnpm exec playwright test tests/features/bem-comer-features.spec.ts`
Expected: all specs PASS (existing 5 + F1/F2/F3 additions).

- [ ] **Step 2: API unit tests.**

Run: `pnpm --filter api exec jest`
Expected: PASS.

### Task 18: Deploy

- [ ] **Step 1: Push from local** (author `Yan Lima Barbosa <yanbr763@gmail.com>`): `git push origin master`.
- [ ] **Step 2: Backup prod DB.** `ssh cardapioweb "docker exec bem-comer-postgres-1 pg_dump -U postgres cardapio_digital_2" > backup-pre-combined-limits.sql` (adjust path).
- [ ] **Step 3: Reconcile server.** `ssh cardapioweb "cd /opt/bem-comer && git fetch && git reset --hard origin/master"`.
- [ ] **Step 4: Build images.** `docker compose -f docker-compose.prod.yml build api web`.
- [ ] **Step 5: Apply migration from the NEW image** (combined_limits): the compiled-config CLI invocation from the deploy memory.
- [ ] **Step 6: `up -d api web`**, then verify: admin can create a combined limit + reorder groups; customer sees combined counter + block; auto-print toggle appears.

---

## Self-Review

**Spec coverage:**
- F1 reorder → Tasks 1-4 (+ confirmed public menu already sorts, so customer reflects it). ✔
- F2 entity/CRUD/enforcement/client/admin-UI → Tasks 5-12. ✔
- F3 kiosk auto-print + toggle + ops docs → Tasks 13-16. ✔
- Tests per feature → Tasks 4, 12, 15. Deploy → Task 18. ✔

**Placeholder scan:** Mirror-tasks (6, 7, 11) intentionally reference sibling files to copy in an existing codebase, but each names exact files, routes, and field names — no vague "add error handling". Concrete code given for all novel logic (entity, migration SQL, policy enforcement, client guard, print hook). ✔

**Type consistency:** `combinedLimit` (entity relation) / `combinedLimitId` (DTO + read models + shared type + policy input) used consistently. `combinedLimits` array shape `{ id, name, maxSelections }` identical across catalog port, admin read, menu read, shared type, policy. `printReceipt`/`enabled`/`setEnabled` consistent between hook and consumers. WS payload `{ id, status, updatedAt }` (verify in Task 13 Step 3). ✔

**Known verify-at-execution points (flagged, not placeholders):** exact products query-key in `use-products-page.ts` (Task 1); admin product cache shape for optimistic reorder (Task 1); `CreateOrderDto` items field name for `optionSelections` (Task 12); WS payload field names (Task 13). Each has an explicit grep-and-confirm step.
