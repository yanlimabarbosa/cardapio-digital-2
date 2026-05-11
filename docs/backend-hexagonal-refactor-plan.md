# Backend Hexagonal Architecture Refactor Plan

Status: Done
Owner: Codex + Yan
Created: 2026-05-07
Repository: `cardapio-digital-2`

This document is the living plan for refactoring the NestJS backend into a hexagonal architecture. It should be updated during the work, not only after the work. Every phase below has an explicit goal, expected file movement, performance guardrails, verification commands, and rollback notes.

The main rule: hexagonal architecture controls dependency direction. It does not require slow database access, over-abstracted repositories, or loading large object graphs for read-heavy endpoints.

## Environment Assumption

This system has a live VPS/homologation deployment, but it is not treated as live business-critical yet. That changes the risk profile: we can tolerate larger internal refactor slices than a mature live system, but we still need disciplined verification because order creation, scheduling, and payments are sensitive flows.

Use stricter checkpoint discipline when touching:

- order creation
- scheduled orders
- payment creation
- PagBank webhook handling
- migrations
- deploy scripts or VPS configuration

Do not deploy, commit, or push during this refactor unless Yan explicitly asks for it.

Local working permissions:

- Frontend, backend, and local database changes are allowed.
- The database runs in Docker locally; use docker compose commands for local DB setup, migrations, and resets when needed.
- If a local server port is stuck, use `killport {portnumber}` before restarting that service.
- Local verification may use `curl` for API checks and Playwright/browser flows for UI or end-to-end behavior.
- Commits are not automatic. They happen only after an explicit commit request.

## Current Backend Shape

Current backend code is mostly organized by Nest modules:

- `apps/api/src/modules/admin`
- `apps/api/src/modules/auth`
- `apps/api/src/modules/coupons`
- `apps/api/src/modules/customers`
- `apps/api/src/modules/delivery-areas`
- `apps/api/src/modules/orders`
- `apps/api/src/modules/payments`
- `apps/api/src/modules/products`
- `apps/api/src/modules/sections`
- `apps/api/src/modules/store`
- `apps/api/src/modules/websocket`
- shared persistence entities in `apps/api/src/entities`
- shared helpers in `apps/api/src/utils`

Current issues this refactor should address:

- Business rules live inside Nest services that also know MikroORM, DTOs, controllers, queues, and external gateways.
- Order creation mixes persistence, availability validation, pricing, customer lookup, coupon logic, item snapshots, loyalty redemption, and transaction management.
- Menu availability is spread across products, sections, store, and shared schedule helpers.
- Payments depend directly on PagBank details in the service layer.
- Testing business rules often requires too much application infrastructure.
- Optimizing one flow risks touching unrelated flows because boundaries are not explicit.

## Target Architecture

Target high-level shape:

```text
apps/api/src/
  modules/
    store/
      store.module.ts
      domain/
      application/
        ports/
        use-cases/
      adapters/
        http/
        persistence/
    menu/
      menu.module.ts
      domain/
      application/
        ports/
        read-models/
        use-cases/
      adapters/
        http/
        persistence/
    orders/
      orders.module.ts
      domain/
      application/
        ports/
        use-cases/
      adapters/
        http/
        persistence/
        realtime/
    payments/
      payments.module.ts
      domain/
      application/
        ports/
        use-cases/
      adapters/
        http/
        pagbank/
        queue/
    customers/
      customers.module.ts
      domain/
      application/
      adapters/
    delivery/
      delivery.module.ts
      domain/
      application/
      adapters/
    coupons/
      coupons.module.ts
      domain/
      application/
      adapters/
    admin/
      admin.module.ts
      application/
      adapters/
  shared/
    domain/
      loyalty-points.policy.ts
      product-price.policy.ts
    application/
      clock/
      unit-of-work/
    infrastructure/
      mikro-orm/
```

Each bounded context should live under `modules/<context>` with its Nest module as the composition root and with its own `domain`, `application`, and `adapters` folders. The earlier `contexts/*` root was an incremental staging shape only; it is not the final topology. The migration should be incremental and should not break existing public routes.

## Dependency Rules

Allowed dependencies:

- `domain` may depend on plain TypeScript and small shared domain utilities.
- `application` may depend on `domain` and port interfaces.
- `adapters` may depend on NestJS, MikroORM, BullMQ, Socket.io, PagBank SDK/API clients, filesystem, and external services.
- Controllers may depend on use cases and request/response DTOs.
- Persistence adapters may map MikroORM entities to domain objects or read models.

Forbidden dependencies:

- `domain` importing `@nestjs/*`
- `domain` importing MikroORM entities, `EntityManager`, `Collection`, or decorators
- `application` importing concrete PagBank clients
- `application` importing Nest controllers or HTTP DTOs
- use cases writing directly to `Response`, queues, sockets, or files

## Core Principles

1. Keep routes stable.
2. Move behavior, not just files.
3. Do not introduce generic repositories where query-specific read models are faster and clearer.
4. Preserve optimized queries for `/api/menu`, `/api/menu/sections`, dashboard, and order history.
5. Use explicit transactions for writes.
6. Use fake ports for use case tests.
7. Keep VPS/homologation deployments slice-based when deployment is requested.
8. Add abstractions only when a real boundary exists.
9. Measure latency and query count around each migrated endpoint.
10. Update this document after every meaningful discovery or completed phase.

## Domain Modeling Style

The backend should use a rich object-oriented domain model for core business rules. The goal is not to put every line of TypeScript inside a class; the goal is to make business behavior explicit, encapsulated, and hard to misuse.

Use rich domain objects for concepts with identity, lifecycle, state transitions, or invariants:

- `Order` should protect totals, item snapshots, scheduled time, status transitions, cancellation rules, and payment state.
- `WeeklySchedule` and `TimeRange` should answer availability questions instead of leaking schedule math across services.
- Payment status transitions should live in a domain object or policy, not scattered `if` statements.
- Coupon and availability rules should be expressed as domain policies/value objects where they affect order correctness.

Avoid anemic domain models:

- Domain objects should not be plain data bags with all rules living in Nest services.
- Use cases should orchestrate; they should not become giant procedural scripts full of business conditionals.
- Services/adapters should not duplicate business rules that belong to domain objects or policies.
- Static helper dumps are not a substitute for a domain model.

Pure functions are allowed when they are genuinely stateless utilities:

- parsing and formatting
- normalizing phone/CPF/string values
- simple DTO/read-model mapping
- small deterministic conversions

Do not wrap simple utilities in classes unless the class adds encapsulation, invariants, lifecycle, dependency injection, or a meaningful domain concept.

Read models are different from rich domain models:

- Public menu, admin dashboard, and history endpoints may use plain read projections for performance.
- Do not hydrate rich aggregates for read-only endpoints unless the behavior needs domain invariants.
- Write flows that change business state should prefer rich domain objects and explicit policies.

Aggregate design rules:

- Aggregates protect invariants; they are not ORM entity mirrors.
- `Order` is the main aggregate candidate because it owns item snapshots, totals, scheduling, payment state, and status transitions.
- `WeeklySchedule`, `TimeRange`, `Money`, and similar concepts should be value objects when they protect validation or behavior.
- `Payment` may be a separate aggregate only if it owns an independent lifecycle; otherwise keep payment transition rules as policies around the order/payment state.
- `Menu`, `Product`, `Category`, and `Section` should not be hydrated as rich aggregates for public reads. Use read models for menu browsing and domain objects/policies only where writes or invariants require them.
- Do not create one aggregate per table by default.

Use case thinness rule:

- Use cases orchestrate: load state, call domain objects/policies, persist results, emit events or notifications.
- Use cases should not become giant procedural scripts with all business conditions inline.
- If a use case has repeated business `if/else` blocks, move the rule into a domain method, value object, or policy.
- External side effects such as WebSocket notifications, queues, payment gateway calls, and file writes stay behind ports.

Persistence ignorance:

- Domain objects must not import MikroORM entities, decorators, `EntityManager`, `Collection`, or repository implementations.
- Persistence adapters are responsible for mapping ORM entities to domain objects/read models and saving changes back.
- Reconstituting an aggregate from the database must produce a valid object or fail clearly.
- Do not let lazy-loaded ORM relations leak into domain behavior.

Domain object creation rules:

- Avoid invalid objects. Constructors/factories should validate required invariants.
- `Order.create(...)` should reject invalid item lists, invalid totals, invalid scheduled times, and invalid payment setup.
- `WeeklySchedule.create(...)` should reject malformed days, invalid `HH:mm`, overlapping/invalid ranges, and ranges that cross midnight unless explicitly supported.
- `Money` should reject negative amounts unless a specific domain concept allows it.
- Value objects should normalize once at the boundary and expose safe values afterward.

Domain events:

- Use domain events for meaningful state changes, not for every setter.
- Candidate events: `OrderCreated`, `OrderScheduled`, `OrderPaid`, `OrderCancelled`, `PaymentApproved`, `PaymentRejected`.
- Domain events should describe what happened in business language.
- Adapters handle side effects caused by events; domain objects do not send sockets, enqueue jobs, call PagBank, or write logs directly.

Architecture anti-patterns:

- Anemic domain objects with all rules in Nest services.
- `Manager` or `Service` classes that centralize unrelated business rules.
- One giant `CreateOrderUseCase` that calculates everything, validates everything, calls every adapter, and emits every side effect inline.
- Generic repositories for every table when a query-specific read model is clearer and faster.
- Duplicated schedule/payment/coupon rules in controllers, services, and frontend code.
- Domain classes that are DTOs with a better name.
- Classes that wrap one stateless utility function without adding a domain concept or invariant.

## TypeScript And OOP Strictness

New or moved backend code should be explicit. Do not rely on TypeScript defaults for code that is part of the new architecture.

Required style for new domain/application code:

- Always write explicit access modifiers on class members and constructors: `public`, `private`, or `protected`.
- Always write `override` when overriding a base class method.
- Always write explicit return types on functions and methods, including `Promise<void>`.
- Prefer `private readonly` dependencies and immutable fields where possible.
- Use TypeScript constructor parameter properties for dependency injection instead of manual field assignment boilerplate.
- Avoid `any`; if an unknown external payload must be handled, start with `unknown` and narrow it.
- Avoid non-null assertions unless the lifecycle guarantee is documented and there is no cleaner alternative.

Dependency injection style:

```ts
export class CreateOrderUseCase {
  public constructor(
    private readonly orders: OrderRepository,
    private readonly clock: Clock,
  ) {}
}
```

Avoid:

```ts
export class CreateOrderUseCase {
  private readonly orders: OrderRepository;
  private readonly clock: Clock;

  public constructor(orders: OrderRepository, clock: Clock) {
    this.orders = orders;
    this.clock = clock;
  }
}
```

Reference enforcement from `/home/yan/codes/workspaces/workspace-study/event-ticket-platform-ddd-hexagonal-clean-arch`:

- Biome `style.useConsistentMemberAccessibility` with `{ "accessibility": "explicit" }` enforces explicit `public/private/protected`.
- Biome `nursery.useExplicitType` enforces explicit type annotations, including return types.
- TypeScript `noImplicitOverride: true` enforces `override`.
- The same reference config also uses `strict: true`, `noFallthroughCasesInSwitch: true`, `useConst: "error"`, `noFloatingPromises: "error"`, `noExplicitAny: "warn"`, and `noNonNullAssertion: "warn"`.

Implementation path for this project:

- This repository has TypeScript `strict: true`.
- API `noImplicitOverride` is enabled in `apps/api/tsconfig.json`.
- A repo-local `pnpm check:api-architecture` script enforces the current backend context dependency boundary and strictness scans.
- Biome is still deferred because adding a new linter dependency and broad style enforcement would be a separate tooling rollout; if enabled later, start enforcement on `apps/api/src/contexts/**`, `apps/api/src/shared/**`, and new tests, then expand.
- The quality gate includes `pnpm check` in addition to targeted tests and smoke checks.

Target Biome rule shape:

```json
{
  "linter": {
    "rules": {
      "recommended": true,
      "style": {
        "useConst": "error",
        "useConsistentMemberAccessibility": {
          "level": "error",
          "options": { "accessibility": "explicit" }
        },
        "noNonNullAssertion": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      },
      "nursery": {
        "noFloatingPromises": "error",
        "useExplicitType": "error"
      }
    }
  }
}
```

Target TypeScript rule:

```json
{
  "compilerOptions": {
    "noImplicitOverride": true
  }
}
```

## Swagger/OpenAPI Documentation Rules

Swagger/OpenAPI is required for API route contracts. Every public/admin route that is added, moved, or materially changed during this refactor must keep request and response documentation accurate.

Required agent instruction:

- Before touching controllers, HTTP DTOs, route response models, or Swagger setup, read [docs/SWAGGER.md](./SWAGGER.md) unless its rules are already loaded in the current context.
- Follow that file for auto-generating Swagger schemas from request/response DTOs and controller signatures.
- If a route returns a response, give the controller method an explicit response DTO return type so the Swagger plugin can generate the response schema.
- If a route accepts a body/query/param DTO, use runtime-visible DTO classes with class-validator decorators so the Swagger plugin can generate the request schema.

Project rule:

- Use the `@nestjs/swagger` CLI plugin and TypeScript/class-validator metadata for autogenerated route request/response schemas.
- Do not add manual `@ApiProperty`, `@ApiResponse`, `@ApiBody`, or other `@Api*` decorators unless Yan explicitly approves an exception.
- DTOs used by controllers must be runtime-visible classes with real enums, class-validator decorators, JSDoc descriptions where helpful, and explicit controller return types.
- API documentation work is an adapter concern. Do not let Swagger DTO choices leak into domain objects.
- A route slice is not done if its request/response contract changed but Swagger generation was not considered.

## File And Naming Conventions

Use predictable names so the architecture remains navigable.

Recommended suffixes:

- domain policies: `*.policy.ts`
- value objects: `*.value-object.ts`
- domain events: `*.event.ts`
- use cases: `*.use-case.ts`
- ports: `*.port.ts`
- read repositories/read models: `*.read-repository.ts`, `*.read-model.ts`
- persistence mappers: `*.mapper.ts`
- HTTP request/response DTOs: `*.dto.ts`
- Nest controllers/modules/providers: keep existing Nest suffixes such as `*.controller.ts`, `*.module.ts`, `*.service.ts`

DTO folder rules:

- Do not keep DTO files flat under `dto/`.
- Put request body, query, and param DTOs under `dto/request`.
- Put response DTOs under `dto/response`.
- Use `dto/shared` only for small nested contract classes reused by both request and response DTOs.
- Do not import request DTOs from response DTOs or response DTOs from request DTOs.
- Controllers may import from both `dto/request` and `dto/response`; mappers should import from `dto/response`.
- Avoid DTO barrel exports until Swagger generation is wired and stable.

Rules:

- Keep names business-specific. Prefer `CreateOrderUseCase` over generic names like `CreateEntityUseCase`.
- Avoid barrel exports from new domain folders until boundaries are stable.
- Do not create catch-all files like `utils.ts`, `helpers.ts`, or `types.ts` inside domain contexts unless the content is genuinely tiny and temporary.
- If a file holds a temporary bridge to legacy code, make that obvious in the name or comment and remove it in the cleanup phase.

## Transaction Boundaries

Transactions belong to application write flows, not domain objects.

Rules:

- Use cases own transaction boundaries for writes.
- Domain objects must not know that a database transaction exists.
- Persistence adapters participate in the transaction provided by the use case/unit of work.
- Do not start nested transactions casually inside repositories/adapters.
- Keep transactions short: validate, persist, and commit.
- Do not call PagBank, sockets, queues, filesystem, or other external side effects inside the database transaction unless there is an explicit reason documented in the plan.
- Prefer emitting notifications/events after a successful commit.
- Server-calculated totals, availability validation, coupon validation, and status transitions must happen inside the consistency boundary needed for the write.

Order/payment guidance:

- Order creation should persist the order in one transaction.
- Payment gateway calls should generally happen after the order transaction commits.
- Webhook processing should be idempotent and use a transaction when applying payment/order status changes.

## Living Plan Protocol

During the refactor, this file should be updated in these cases:

- A phase starts.
- A phase finishes.
- A blocker is found.
- A decision changes the architecture.
- A new port/use case is introduced.
- A performance assumption is proven wrong.
- A route changes behavior.
- A migration is added.
- A VPS deployment checkpoint is reached.

Use this status vocabulary:

- `Not started`
- `In progress`
- `Blocked`
- `Ready for review`
- `Done`
- `Deferred`

Every update should include:

- Date
- Phase
- What changed
- Verification performed
- Remaining risk

Suggested update block:

```md
### 2026-05-07 - Phase N - Short title

Status: Done

Changed:
- ...

Verified:
- ...

Risks:
- ...
```

## Quality Gate Between Steps

The refactor must behave like many small high-quality tasks, not one rushed rewrite. Codex must not start the next phase or sub-phase until the current slice passes this gate and Codex has performed its own review.

This is a Codex self-guided refactor. Human review is useful but is not a required checkpoint between phases unless Yan explicitly asks Codex to pause. Codex should review its own diff, fix any issue it finds, rerun the relevant checks, review again, and continue to the next unchecked phase once the gate passes.

Step size rules:

- Work on one phase or one named sub-phase at a time.
- Do not mix backend architecture, frontend UI, visual styling, database migrations, payment behavior, and deploy work in the same slice.
- Prefer a smaller slice if the exact write scope cannot be explained in a short paragraph.
- Do not create abstractions ahead of need. Extract only around behavior that is being moved or protected by tests.
- Keep route contracts stable unless Yan explicitly approves a behavior change.

Quality gate:

- The moved behavior is covered by the right test level from the Testing Pyramid.
- Existing affected tests pass, or any failing test is documented with a concrete reason and not ignored.
- API behavior may be verified with targeted `curl` checks when that is the fastest reliable signal.
- UI and checkout behavior may be verified with Playwright or browser checks when code inspection is not enough.
- API/web typechecks pass when the slice touches those packages.
- Dependency checks pass for moved domain/application code.
- New or moved TypeScript follows the TypeScript And OOP Strictness rules: explicit access modifiers, explicit return types, required `override`, and no casual `any`.
- New files follow File And Naming Conventions.
- Write flows follow Transaction Boundaries.
- `git diff --check` passes.
- The plan has been updated with changed files, verification, remaining risk, and next recommended slice.
- The diff is reviewable: no unrelated formatting churn, no opportunistic rewrites, no hidden behavior changes.
- Codex has reviewed the diff from a code-review stance, fixed any findings within the current scope, and rerun the relevant verification after fixes.

Self-review loop:

1. Implement the smallest coherent slice.
2. Run targeted verification.
3. Review the diff for regressions, contract changes, missing tests, dependency-rule violations, performance risk, and unrelated churn.
4. If the review finds issues that can be fixed within the current slice, fix them and rerun verification.
5. Repeat review and verification until the slice passes or a stop condition is reached.
6. Mark the phase or sub-phase `Done` in this plan, record verification and risk.
7. Stage the reviewed passing slice with `git add`, but do not commit.
8. Continue to the next unchecked phase if Yan has requested a self-guided run.

Stop conditions:

- Typecheck or relevant tests fail.
- The implementation needs a migration or data backfill that was not planned.
- The slice touches payment/order/schedule behavior in a way not covered by tests.
- The code starts duplicating business rules across old and new paths without a clear temporary bridge.
- A performance-sensitive endpoint risks extra queries and no baseline exists.

When a stop condition happens, Codex should first try a smaller safe fix if it is clearly within scope. If the blocker cannot be resolved safely without changing the agreed scope, Codex should document the blocker here, explain the safest smaller next step, and stop instead of continuing deeper into the refactor.

## Phase 0 - Baseline And Safety Net

Status: Done

Goal: establish a reliable baseline before moving code.

Tasks:

- Record current baseline commit and current VPS commit if deploy is involved.
- Confirm local `web` and `api` typechecks pass.
- Run the highest-signal API checks available.
- Record current public endpoint payload shapes for:
  - `/api/store/status`
  - `/api/menu`
  - `/api/menu/sections`
  - order creation
  - payment creation
  - PagBank webhook
- Add or update a small smoke-test script if missing.
- Decide whether this refactor uses one long branch or smaller stacked branches.

Verification:

```bash
pnpm --filter api exec tsc --noEmit --pretty false
pnpm --filter web exec tsc --noEmit --pretty false
curl -sS http://localhost:3334/api/store/status | head -c 500
curl -sS http://localhost:3334/api/menu | head -c 500
```

Performance baseline to capture:

- `/api/menu` response time
- `/api/menu/sections` response time
- `/api/admin/dashboard` response time
- order creation response time before payment
- query count where practical

Exit criteria:

- Baseline documented.
- Current behavior understood.
- No unrelated dirty files.

## Phase 1 - Architecture Skeleton

Status: Done

Goal: create the folder structure and dependency conventions without moving risky behavior.

Tasks:

- Add `contexts/*` structure.
- Add `shared/application` and `shared/infrastructure` structure.
- Add README or comments explaining dependency rules.
- Add path aliases only if they improve clarity and do not fight the current TS config.
- Keep existing modules working.

Expected files:

```text
apps/api/src/contexts/
apps/api/src/shared/application/
apps/api/src/shared/infrastructure/
```

Exit criteria:

- No behavior changes.
- Typecheck passes.
- Existing Nest modules still boot.

## Phase 2 - Extract Pure Domain Policies

Status: Done

Goal: move pure business rules first because they are easiest to test and least coupled to infrastructure.

Candidates:

- schedule availability policy
- store force-open/force-close policy
- order status transition policy
- product effective price policy
- coupon applicability policy
- delivery area normalization/matching policy
- loyalty points calculation policy

Important note:

The shared package already contains schedule utilities. Do not duplicate them blindly. Decide whether each rule belongs in `packages/shared` or backend domain. Public frontend-safe utilities can stay in `packages/shared`; backend-only policies should live in backend contexts.

Expected domain services:

```text
contexts/store/domain/store-availability.policy.ts
contexts/orders/domain/order-status.policy.ts
contexts/menu/domain/menu-availability.policy.ts
contexts/payments/domain/payment-status.policy.ts
```

Tests to add:

- force close blocks store
- force open opens store but not category/section windows
- lunch available 11:00-15:00
- dinner available Monday-Saturday 18:00-21:00
- Sunday dinner unavailable
- invalid order status transitions rejected

Exit criteria:

- Extracted policies have unit tests.
- Old services call the new policies.
- No route behavior changes.

## Phase 3 - Introduce Application Use Cases Around Existing Services

Status: Done

Goal: add use case boundaries while using current services internally where necessary.

Initial use cases:

```text
GetStoreStatusUseCase
UpdateStoreSettingsUseCase
GetPublicMenuUseCase
GetPublicSectionsUseCase
CreateOrderUseCase
ChangeOrderStatusUseCase
CreatePixPaymentUseCase
CreateCardPaymentUseCase
HandlePagBankWebhookUseCase
```

Temporary acceptable pattern:

```ts
export class CreateOrderUseCase {
  constructor(private readonly legacyOrdersService: OrdersService) {}

  execute(command: CreateOrderCommand) {
    return this.legacyOrdersService.create(command);
  }
}
```

This is not the final state. It creates a seam so controllers can depend on use cases first, then internals can move behind ports.

Exit criteria:

- Controllers call use cases.
- Existing route behavior preserved.
- Tests still pass.

## Phase 4 - Store Context

Status: Done

Goal: make store settings and store status independent from controller/service infrastructure.

Domain:

- `StoreSchedule`
- `StoreMode`
- `StoreAvailabilityPolicy`

Application ports:

```ts
interface StoreSettingsRepository {
  get(): Promise<StoreSettingsModel>;
  save(settings: StoreSettingsModel): Promise<StoreSettingsModel>;
}

interface Clock {
  now(): Date;
}
```

Use cases:

- `GetStoreStatusUseCase`
- `GetStoreSettingsUseCase`
- `UpdateStoreSettingsUseCase`
- `SetStoreModeUseCase`

Adapters:

- `MikroOrmStoreSettingsRepository`
- `StoreController`
- admin controller methods for store settings

Performance:

- Store settings can be cached with a short TTL or invalidated after admin writes.
- Avoid querying store settings multiple times in the same request flow.

Exit criteria:

- `StoreService` either removed or reduced to adapter wiring.
- `/api/store/status` unchanged.
- admin store settings unchanged.

## Phase 5 - Menu Read Models

Status: Done

Goal: move public menu and sections into use cases with optimized read adapters.

Do not hydrate rich aggregates for menu reads. Public menu is a read-heavy projection.

Application ports:

```ts
interface MenuReadRepository {
  getMenu(query: MenuAvailabilityQuery): Promise<MenuReadModel[]>;
  getProductsByIds(query: ProductLookupQuery): Promise<ProductReadModel[]>;
}

interface SectionReadRepository {
  getPublicSections(query: MenuAvailabilityQuery): Promise<SectionReadModel[]>;
}
```

Use cases:

- `GetPublicMenuUseCase`
- `GetFeaturedProductsUseCase`
- `GetProductsByIdsUseCase`
- `GetPublicSectionsUseCase`

Performance guardrails:

- Preserve current eager loading or replace with explicit optimized queries.
- No N+1 product extras/options queries.
- Cache static menu structure if safe.
- Compute availability from cached schedules and request `scheduledFor`.

Exit criteria:

- `/api/menu`, `/api/menu/featured`, `/api/menu/products`, `/api/menu/sections` behavior unchanged.
- Response time not worse than baseline by more than an agreed threshold.

## Phase 6 - Orders Write Model

Status: Done

Goal: move order creation and status changes into application use cases with explicit transaction boundaries.

Domain:

- `Order`
- `OrderItem`
- `OrderStatusTransitionPolicy`
- `OrderTotals`
- `ScheduledOrderPolicy`

Application ports:

```ts
interface UnitOfWork {
  run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}

interface OrderRepository {
  nextDailySequence(date: Date): Promise<number>;
  create(order: NewOrderModel): Promise<OrderModel>;
  findById(id: string): Promise<OrderModel | null>;
  save(order: OrderModel): Promise<void>;
}

interface ProductCatalogRepository {
  findOrderableProducts(ids: string[]): Promise<OrderableProductModel[]>;
}

interface CustomerRepository {
  findOrCreateForOrder(command: CustomerInput): Promise<CustomerModel>;
}

interface RealtimeNotifier {
  orderCreated(order: OrderEventModel): Promise<void>;
  orderStatusChanged(order: OrderEventModel): Promise<void>;
}
```

Use cases:

- `CreateOrderUseCase`
- `ChangeOrderStatusUseCase`
- `CancelOrderUseCase`
- `GetKitchenOrdersUseCase`
- `GetAdminOrdersUseCase`
- `GetOrderDetailsUseCase`

Performance guardrails:

- One transaction for order creation.
- Product lookup should fetch all products/options/extras in batches.
- Daily sequence must remain atomic.
- Payment amount must use server-calculated total.
- Realtime events should happen after successful transaction commit where possible.

Exit criteria:

- Manual request cannot order unavailable products.
- Scheduled order validation still respects store and category windows.
- Status transitions unchanged.
- Kitchen/admin order payloads unchanged.

## Phase 7 - Payments Context

Status: Done

Goal: isolate PagBank behind ports and make payment flows testable without the real gateway.

Domain/application concepts:

- `PaymentMethod`
- `PaymentRequest`
- `PaymentResult`
- `PaymentStatus`
- `PaymentWebhookEvent`

Ports:

```ts
interface PaymentGateway {
  createPixPayment(input: PixPaymentInput): Promise<PixPaymentResult>;
  createCreditCardPayment(input: CardPaymentInput): Promise<CardPaymentResult>;
  createDebitCardPayment(input: DebitPaymentInput): Promise<CardPaymentResult>;
  getPaymentStatus(externalId: string): Promise<PaymentStatusResult>;
}

interface PaymentWebhookVerifier {
  verify(headers: WebhookHeaders, rawBody: Buffer): boolean;
}

interface PaymentWebhookQueue {
  enqueue(event: PaymentWebhookEvent): Promise<void>;
}
```

Adapters:

- `PagBankPaymentGateway`
- `PagBankWebhookVerifier`
- `BullMqPaymentWebhookQueue`
- `PaymentsController`
- `WebhookController`

Performance guardrails:

- Webhook endpoint should return quickly.
- Expensive reconciliation stays in queue processor.
- Gateway request/response evidence logging remains optional and redacted.

Exit criteria:

- Pix, credit, debit flows unchanged.
- Webhook behavior unchanged.
- Payment tests can run with fake gateway.
- Playwright covers the customer checkout/payment UI flow with PagBank mocked or sandboxed.
- API/integration tests cover PagBank payment creation and webhook processing without depending on the real gateway by default.

## Phase 8 - Admin Context And Mutations

Status: Done

Goal: separate admin use cases from public menu/order use cases.

Admin use cases:

- `CreateCategoryUseCase`
- `UpdateCategoryUseCase`
- `ReorderCategoriesUseCase`
- `CreateProductUseCase`
- `UpdateProductUseCase`
- `ToggleProductUseCase`
- `ManageProductExtrasUseCase`
- `ManageOptionGroupsUseCase`
- `CreateSectionUseCase`
- `SetSectionProductsUseCase`
- `UpdateDeliveryAreaUseCase`
- `UpdateCouponUseCase`

Performance guardrails:

- Admin writes should invalidate related read caches.
- Admin list endpoints can keep read projections.
- Do not make public menu depend on admin service internals.

Exit criteria:

- Admin UI behavior unchanged.
- Public cache invalidation works after mutations.

## Phase 9 - Customers, Loyalty, Delivery, Coupons

Status: Done

Goal: move supporting contexts after core order/menu/payment boundaries are stable.

Suggested order:

1. Delivery areas
2. Customers/authentication profile
3. Loyalty
4. Coupons

Reason:

- Delivery is small and easy to isolate.
- Customers touch order creation and loyalty.
- Coupons touch order totals and eligibility, so migrate after order use case shape is stable.

Exit criteria:

- Existing customer login/order lookup unchanged.
- Loyalty points and redemption unchanged.
- Coupons still validate preview and revalidate on order creation.

## Phase 10 - Remove Legacy Services And Clean Modules

Status: Done

Goal: remove dead logic and leave a coherent architecture.

Tasks:

- Remove services that only proxy to use cases.
- Keep Nest modules as composition roots.
- Ensure each context has clear public exports.
- Remove obsolete DTO mappings.
- Update docs and diagrams.
- Add architecture enforcement notes.

Exit criteria:

- No business rule remains in controllers.
- No domain/application layer imports Nest or MikroORM.
- Tests cover the core policies/use cases.
- VPS/homologation deploy verified if deployment is requested.

## Phase 11 - Module Topology Consolidation

Status: Done

Goal: remove the confusing parallel `contexts/<context>` and `modules/<context>` source roots. The final backend source topology is `apps/api/src/modules/<bounded-context>`, where each bounded context owns its Nest composition root plus its `domain`, `application`, and `adapters` layers.

Target module shape:

```text
apps/api/src/modules/<bounded-context>/
  <bounded-context>.module.ts
  domain/
  application/
    ports/
    read-models/
    use-cases/
  adapters/
    http/
    persistence/
    queue/
    realtime/
```

Rules:

- Do not create new bounded contexts under `apps/api/src/contexts`.
- Move one bounded context at a time.
- Keep controllers/DTOs/routes stable unless a slice explicitly declares a Swagger-aware HTTP adapter move.
- Update import paths mechanically and avoid behavior changes during topology-only slices.
- Keep architecture checks aware of both the temporary `contexts/*` layout and the target `modules/*` layout until the migration is complete.
- Stage each reviewed passing slice, but do not commit.

Suggested order:

1. `store` - Done on 2026-05-07 for source domain/application/persistence topology.
2. `menu` - Done on 2026-05-07 for source domain/application/persistence topology and composition root.
3. `delivery` - Done on 2026-05-07 for source domain/application/persistence topology under `modules/delivery-areas`.
4. `coupons` - Done on 2026-05-07 for source domain/application/persistence topology under `modules/coupons`.
5. `customers` - Done on 2026-05-07 for source domain/application/persistence topology under `modules/customers`.
6. `payments` - Done on 2026-05-07 for source domain/application/adapters topology under `modules/payments`.
7. `orders` - Done on 2026-05-07 for source domain/application/adapters topology under `modules/orders`.
8. `admin` - Done on 2026-05-07 for source domain/application/adapters topology under `modules/admin`; the temporary `apps/api/src/contexts` source root is removed.

Exit criteria:

- No source files remain under `apps/api/src/contexts`.
- Each bounded context has a single source home under `apps/api/src/modules/<context>`.
- Architecture checks pass for module-local domain/application boundaries.
- Tests and imports no longer reference `apps/api/src/contexts/*`.
- Public API behavior remains stable.

## Performance Strategy

Performance risks:

- Over-generic repositories causing N+1 queries.
- Full domain aggregate hydration for read-only endpoints.
- Extra database round trips per use case.
- Cache invalidation bugs.
- Excess object mapping on large menu payloads.

Rules:

- Use read-model repositories for read-heavy endpoints.
- Use domain aggregates for write-heavy consistency flows.
- Allow persistence adapters to use MikroORM query builder or raw SQL when justified.
- Batch load related data for order creation.
- Keep transactions short.
- Cache store/menu static data carefully.
- Invalidate cache after admin writes.
- Measure before and after each phase.

Suggested endpoint budget:

```text
/api/store/status       should be very fast; ideally one cached settings read
/api/menu               should stay close to current baseline
/api/menu/sections      should stay close to current baseline
/api/admin/dashboard    aggregation should remain database-side
/api/orders             one transaction; no external payment gateway call here
/api/webhooks/pagbank   quick validation + queue enqueue
```

## Testing Pyramid

Use the cheapest test that protects the behavior. Do not push everything into Playwright.

Level 1 - Pure unit tests:

- Test domain policies, value objects, and status transitions without Nest, MikroORM, Redis, queues, or HTTP.
- Cover availability intersection rules, order status rules, payment status mapping, coupon eligibility, and schedule edge cases.
- These tests should be fast enough to run constantly during refactor work.

Level 2 - Use case tests with fake ports:

- Test application use cases with in-memory/fake ports.
- Verify transaction boundaries, calculated totals, selected schedules, payment method decisions, and emitted events.
- Use fake clocks for scheduling and fake gateways for payments.

Level 3 - Adapter integration tests:

- Test MikroORM repositories, migrations, and query-specific read models against the local Docker database.
- Test queue/webhook adapters with mocked BullMQ queues.
- Test PagBank adapters with mocked HTTP responses by default, not the real gateway.

Level 4 - API contract tests:

- Test controller/use-case wiring, validation pipes, auth behavior, HTTP status codes, and public response shapes.
- Protect `/api/store/status`, `/api/menu`, `/api/menu/sections`, order creation, payment creation, and PagBank webhook routes.

Level 5 - Playwright E2E:

- Cover only browser-critical flows: public menu, preorder, cart, checkout, payment selection, and final payment UI state.
- Public menu loads.
- Unavailable item can be preordered for the next valid session.
- Manual request for unavailable item is rejected server-side.
- Cart checkout sends `scheduledFor`.
- Pix/card/debit payment flows reach payment creation.
- PagBank webhook confirmation can be simulated to verify the paid-order UI.

Level 6 - PagBank sandbox:

- Opt-in only when sandbox credentials are configured.
- Use it to verify real Pix QR Code creation, card encryption, debit 3DS, and gateway evidence capture.
- Do not make real sandbox tests mandatory for the normal local refactor loop.

Existing PagBank test inventory:

- `tests/pagbank/pagbank-sandbox-checkout.spec.ts` covers Pix, credit card, debit/3DS, gateway error translation, server-calculated totals, mocked webhook confirmation, and sandbox evidence capture.
- `tests/pagbank/pagbank-webhook.spec.ts` covers webhook signature verification, payload mapping, status mapping, BullMQ enqueue contract, and ignored unmappable charge webhooks.
- `playwright.config.ts` starts the API and web app for E2E using `PAGBANK_EVIDENCE_ENABLED=true` and reuses existing servers when available.

Useful commands:

```bash
pnpm test:e2e tests/pagbank/pagbank-webhook.spec.ts
pnpm test:e2e tests/pagbank/pagbank-sandbox-checkout.spec.ts
```

Minimum verification per phase:

```bash
pnpm --filter api exec tsc --noEmit --pretty false
pnpm --filter web exec tsc --noEmit --pretty false
git diff --check
```

After quality/strictness tooling is added:

```bash
pnpm check
```

Add more targeted tests as contexts move.

PagBank test split:

- Playwright should validate the browser flow: cart, customer data, delivery/pickup choice, scheduled order if present, payment method selection, payment request, and final UI state.
- API/integration tests should validate the server contract: amount calculation, order ownership, payment record creation, gateway payload mapping, idempotency, and webhook status transitions.
- Real PagBank sandbox tests should be opt-in, isolated by environment variables, and never required for the normal local verification loop.

## Observability

Goal: make order, schedule, payment, and webhook bugs traceable without leaking sensitive data.

Logging rules:

- Use structured log fields where practical: `orderId`, `orderNumber`, `customerId`, `paymentId`, `referenceId`, `scheduledFor`, `paymentMethod`, `status`, `durationMs`.
- Never log CPF, card data, access tokens, raw authorization headers, full PagBank payloads, or unredacted customer addresses.
- Log one clear success event for order creation, payment creation, webhook enqueue, webhook processing, and status transition.
- Log validation failures at a low/noisy-safe level; log unexpected infrastructure failures as warnings/errors.
- Include timing around external gateway calls and queue processing.

Payment evidence:

- Keep PagBank evidence capture behind explicit env flags.
- Redact tokens, encrypted card data, 3DS session payloads, CPF, phone, email, and addresses.
- Store evidence only under test/debug directories, not regular application logs.

Debuggability requirements by phase:

- When moving order creation, preserve or improve order-created logs.
- When moving payments, preserve PagBank request/response evidence behavior.
- When moving webhooks, preserve enough logs to answer: what payment arrived, what order it mapped to, what status was applied, and whether it was ignored.
- When adding caches, log cache invalidation failures and expose a simple way to bypass cache locally if needed.

## Dependency Enforcement

The architecture is only useful if dependency direction is enforced.

Rules to enforce:

- `domain` cannot import `@nestjs/*`, MikroORM, HTTP DTOs, queues, sockets, filesystem, or PagBank clients.
- `application` cannot import controllers, Nest providers, MikroORM entities, queue implementations, socket gateways, or concrete PagBank adapters.
- `adapters` can import Nest, MikroORM, queues, sockets, and external clients.
- Nest modules are composition roots and may wire use cases to concrete adapters.
- Shared types must not become a hidden dependency bucket for business behavior.

Practical enforcement path:

- During early phases, use targeted `rg` checks before and after moving a context.
- Once the folder structure stabilizes, add an automated architecture check using ESLint boundaries, dependency-cruiser, or a small repo-local script.
- Add the architecture check to the normal verification loop before removing legacy services.

Initial manual checks:

```bash
rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application
rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application
```

Exit condition:

- A moved context is not considered done until its domain/application layers pass dependency checks.

## Deployment Strategy

Do not deploy every file movement. Deploy to the VPS/homologation environment only when explicitly requested and when a slice is coherent.

Safe deploy slice requirements:

- Typecheck passes.
- Existing route contracts are preserved.
- Migration is forward-only safe if present.
- VPS deploy commands are known.
- Smoke checks are listed.

VPS deploy checklist:

```bash
git status --short
git push origin master

ssh cardapioweb
cd /opt/bem-comer
git pull --ff-only
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml run --rm api pnpm exec mikro-orm migration:up --config ./src/config/mikro-orm.config.ts
docker compose -f docker-compose.prod.yml up -d api web
docker compose -f docker-compose.prod.yml ps
```

Smoke checks:

```bash
curl -I https://cardapiobemcomer.com.br
curl -sS https://cardapiobemcomer.com.br/api/store/status | head -c 500
curl -sS https://cardapiobemcomer.com.br/api/menu | head -c 500
```

## Rollback Strategy

Code rollback:

- Revert the latest slice commit or redeploy previous known-good commit.
- Avoid destructive database rollback unless absolutely required.

Database rollback:

- Prefer forward fix migrations.
- Only use migration down if data loss risk is understood.
- Back up the VPS database before risky schema changes.

Operational rollback:

- Keep old containers/images until new smoke checks pass.
- If API fails after deploy, inspect logs before applying another migration.

## How To Run This In Codex

Best practice for a self-guided multi-hour refactor:

1. Keep this plan file as the source of truth.
2. Let Codex work one phase or one named sub-phase at a time.
3. Require Codex to state the exact write scope before editing.
4. Require Codex to update this file after each phase or sub-phase.
5. Require the Quality Gate Between Steps before continuing.
6. Keep commits small and semantic, but only when Yan asks for commits.
7. After each slice passes self-review and verification, stage the slice with `git add`; do not commit unless Yan asks.
8. Do not let a 5-hour run mix architecture, visual changes, payment changes, and deployment without checkpoints.
9. Run tests/typechecks at each boundary.
10. Ask for a status update if the run is long.
11. Avoid interactive git operations.
12. Do not deploy until the current slice is coherent and deployment is requested.
13. If context compacts, tell Codex to read this file first and continue from the latest status block.

Best prompt shape:

```text
Read docs/backend-hexagonal-refactor-plan.md.
Work only on Phase N / sub-phase X.
Before editing, state the exact write scope.
Implement the smallest coherent slice.
Run the relevant checks from the Quality Gate.
Review your own diff, fix any findings, rerun checks, and update the plan with what changed, verification, risk, and next recommended slice.
If the self-review passes, stage the passing slice and continue to the next unchecked phase. Do not commit, push, or deploy unless I ask.
```

Suggested prompt to continue work:

```text
Read docs/backend-hexagonal-refactor-plan.md. Continue the next unchecked phase only.
Keep routes stable. Update the plan as you go. Run typechecks. Self-review, fix findings, rerun checks, stage passing slices, and continue while the quality gate passes. Do not deploy and do not commit unless I ask.
```

Suggested prompt for a long autonomous run:

```text
Read docs/backend-hexagonal-refactor-plan.md and execute phases incrementally.
After each phase or sub-phase: update the doc, run verification, review your own diff, fix findings, rerun checks, stage the passing slice, create a concise status report, and continue only if the Quality Gate passes.
Do not deploy unless explicitly requested. Do not skip tests. If a blocker appears, document it and choose the safest smaller step.
```

For a 5-hour refactor, the best practice is not one giant uninterrupted task. A better cadence:

- 30 to 60 minute implementation slice
- typecheck/tests
- plan update
- commit if requested
- brief review
- continue

This keeps the work recoverable if the session is interrupted.

Highest-quality cadence:

- Codex performs one coherent slice.
- Codex verifies, self-reviews, fixes findings, and reruns verification.
- Codex updates this plan with status, verification, risks, and next recommended slice.
- Codex stages the passing slice without committing.
- Codex continues to the next unchecked phase unless Yan explicitly asks it to pause.

Use long autonomous runs only for low-risk mechanical phases. For orders, payments, schedules, migrations, and cache behavior, prefer shorter reviewable slices.

## Codex Operating Loop

For this project, Codex should use this loop:

1. Read latest plan status.
2. Inspect current files for the selected phase.
3. Identify exact write scope.
4. Make minimal structural changes.
5. Run targeted verification.
6. Review its own diff from a code-review stance.
7. Fix any findings within scope and rerun targeted verification.
8. Update this plan.
9. Stage the passing slice without committing.
10. Continue to the next unchecked phase if the quality gate passes and no explicit pause was requested.

If a task touches payments, order creation, migrations, or deploy, Codex should slow down, create an explicit checkpoint in this plan, self-review more strictly, and continue only if verification covers the risk.

## Initial Phase Checklist

- [x] Phase 0 - Baseline And Safety Net
- [x] Phase 1 - Architecture Skeleton
- [x] Phase 2 - Extract Pure Domain Policies
- [x] Phase 3 - Introduce Application Use Cases Around Existing Services
- [x] Phase 4 - Store Context
- [x] Phase 5 - Menu Read Models
- [x] Phase 6 - Orders Write Model
- [x] Phase 7 - Payments Context
- [x] Phase 8 - Admin Context And Mutations
- [x] Phase 9 - Customers, Loyalty, Delivery, Coupons
- [x] Phase 10 - Remove Legacy Services And Clean Modules

## Decision Log

### 2026-05-07 - Initial plan

Decision:
- Use incremental hexagonal migration, not a big-bang rewrite.
- Preserve existing API routes and public payloads during the refactor.
- Prefer read-model adapters for public menu and admin dashboard performance.
- Use use cases and ports for business writes and external systems.

Reason:
- The system is not considered live business-critical yet.
- There is still a deployed VPS/homologation environment, so deploy discipline matters.
- Menu/order/payment flows are correctness-critical even before launch.
- A big-bang rewrite would create unnecessary regression risk.

## Progress Log

### 2026-05-06 - Phase 0 - Baseline captured

Status: Done

Changed:
- Captured local baseline from `master` at commit `25bcde614009f892e9076083586ca8e9afdd562d`.
- VPS commit was not captured because no deploy was involved.
- Cleared local ports with `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`, then started a fresh API server on `http://localhost:3334`.
- Added `scripts/api-smoke.mjs` and root `pnpm smoke:api` for safe API smoke checks.
- Branch strategy decision: use small self-reviewed slices, with commits/branches only when Yan asks. Current work remains uncommitted.
- Self-guided cadence decision: Codex should review its own diff, fix findings, rerun checks, then continue to the next unchecked phase when the quality gate passes.
- Staging decision: after a slice passes self-review and verification, Codex should stage the passing changes with `git add`; commits remain explicit-only.

Baseline:
- `/api/store/status`: `200`; times `0.007268s`, `0.004646s`, `0.003693s`; object keys `open`, `reason`, `nextOpenAt`, `nextOpenLabel`, `opensAt`, `closesAt`, `openDays`, `weeklySchedule`, `bannerUrl`.
- `/api/menu`: `200`; times `0.327182s`, `0.231204s`, `0.223622s`; array length `6`; first item keys `id`, `name`, `description`, `imageUrl`, `availabilitySchedule`, `isAvailable`, `availabilityMessage`, `nextAvailableAt`, `products`.
- `/api/menu?scheduledFor=<nextOpenAt>`: `200` in `0.263171s`; used to find an available simple product for order baseline.
- `/api/menu/sections`: `200`; times `0.006393s`, `0.004048s`, `0.003298s`; local response was an empty array, so no item shape was captured.
- `/api/admin/dashboard`: `200`; times `0.029698s`, `0.017790s`, `0.015581s`; keys `todayOrdersCount`, `todayPaidCount`, `todayRevenue`, `avgTicket`, `ordersByStatus`, `revenueByHour`, `topProducts`, `byPayment`, `weeklyRevenue`.
- `POST /api/orders`: scheduled pickup Pix order returned `201` in `0.036596s`; keys `id`, `orderNumber`, `customerName`, `customerPhone`, `status`, `totalAmount`, `couponCode`, `discountAmount`, `deliveryFee`, `paymentMethod`, `deliveryType`, `scheduledFor`, `items`, `createdAt`, `updatedAt`, `customerToken`; item keys `id`, `productName`, `unitPrice`, `quantity`, `subtotal`, `extras`, `groupedExtras`.
- `POST /api/payments/pix`: real PagBank sandbox Pix creation returned `201` in `6.374747s`; keys `paymentId`, `qrCode`, `qrCodeBase64`, `expiresAt`; redacted QR payload lengths were `qrCode=182`, `qrCodeBase64=5220`.
- `POST /api/webhooks/pagbank`: signed mocked charge webhook returned `200` in `0.004262s`; keys `received`; follow-up `GET /api/payments/:orderId/status` returned `orderStatus=paid`, `paymentStatus=approved`.
- Query counts were not formally captured; MikroORM debug logging is enabled locally, but there is not yet an automated query-count harness.

Verified:
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm smoke:api`
- `NEXT_PUBLIC_API_URL=http://localhost:3334 pnpm test:e2e tests/pagbank/pagbank-webhook.spec.ts`
- Manual `curl` baselines for store status, menu, menu sections, admin dashboard, order creation, Pix payment creation, signed PagBank webhook, and payment status after webhook.

Risks:
- Local `/api/menu/sections` currently returned `[]`, so Phase 5 should capture a non-empty sections fixture before using this as the only payload baseline.
- Pix payment baseline depends on PagBank sandbox latency and credentials; keep real sandbox checks opt-in for normal refactor loops.
- The successful order/payment/webhook baseline mutated only the local database.
- No architecture code has moved yet; Phase 1 should create structure only and preserve all route contracts.

### 2026-05-06 - Phase 1 - Architecture skeleton

Status: Done

Changed:
- Added `apps/api/src/contexts/README.md` with dependency direction and forbidden dependency rules.
- Added the target context directory skeleton for store, menu, orders, payments, customers, delivery, coupons, and admin using `.gitkeep` placeholders.
- Added `apps/api/src/shared/README.md` plus shared application and infrastructure skeleton directories.
- Did not add or change path aliases; the existing `@/*` alias remains unchanged.
- Did not move behavior, change routes, add migrations, or touch runtime Nest modules.

Verified:
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- No TypeScript exports, imports, providers, controllers, modules, DTOs, entities, migrations, or package runtime dependencies were added.
- The skeleton is documentation/placeholders only, so public route behavior should be unchanged.
- Existing Nest modules compiled and booted before the smoke checks.

Risks:
- `.gitkeep` placeholders should be removed naturally as real files are introduced in later phases.
- Dependency enforcement is still manual until a later phase adds an automated architecture check.
- Next recommended slice is Phase 2, starting with one pure policy extraction and focused unit tests.

### 2026-05-06 - Phase 2 - Order status policy

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/domain/order-status.policy.ts`.
- Moved the existing order status transition table out of `OrdersService` and into `OrderStatusTransitionPolicy`, a pure orders domain policy object.
- Updated `OrdersService.updateStatus` to instantiate the policy for the current status while preserving the existing `BadRequestException` message.
- Added `apps/api/test/contexts/orders/order-status.policy.test.ts` with pure transition tests.
- Added `pnpm --filter api test:unit` for Node test runner based unit tests.
- Removed `apps/api/src/contexts/orders/domain/.gitkeep` because the folder now has real domain code.
- After the `Domain Modeling Style` section was added, revised the extraction away from loose helper functions and toward an explicit domain policy object.
- After rereading the new TypeScript/OOP strictness rules, added explicit public access modifiers, explicit test callback return types, and removed the non-null assertion from the touched status transition path.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The domain policy imports only `OrderStatus` from `@cardapio/shared`; it does not import Nest, MikroORM, entities, DTOs, queues, sockets, or adapters.
- `OrderStatusTransitionPolicy` encapsulates the current status and transition behavior, matching the rich-domain guidance without wrapping a generic utility.
- The new domain policy now uses explicit member accessibility and method return types. The touched service path avoids `order.status!`.
- The service still owns HTTP exception translation, so route behavior and error text remain stable.
- The first unit-test command failed because Node did not expand `test/**/*.test.ts`; the script was fixed to discover files with `find`, then tests passed.

Risks:
- Phase 2 is not complete; only the order status transition policy has been extracted.
- `OrdersService` still contains order creation, schedule, pricing, coupon, loyalty, and persistence behavior.
- Next recommended slice is another small pure policy extraction with focused unit coverage, preferably one that can be called from existing services without changing route contracts.

### 2026-05-06 - Phase 2 - Store availability policy

Status: Done

Changed:
- Added `apps/api/src/contexts/store/domain/store-availability.policy.ts`.
- Moved `StoreService.isOpen` force-close, force-open, schedule evaluation, and availability message selection into `StoreAvailabilityPolicy`.
- Reused the existing shared schedule utilities instead of duplicating schedule math in backend domain code.
- Added `apps/api/test/contexts/store/store-availability.policy.test.ts` with force-close, force-open, ignored force-open, schedule-window, and invalid-date coverage.
- Removed `apps/api/src/contexts/store/domain/.gitkeep` because the folder now has real domain code.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The domain policy imports only shared schedule utilities and shared `WeeklySchedule`; it does not import Nest, MikroORM, entities, DTOs, queues, sockets, adapters, or filesystem.
- The policy encapsulates the store availability decision while `StoreService` stays responsible for loading settings and translating persistence data into policy input.
- The policy uses a private constructor with a named factory, constructor parameter property assignment, explicit member accessibility, and explicit return types.
- No `any` or non-null assertions were introduced.
- `/api/store/status` smoke output stayed within the captured route contract.

Risks:
- Phase 2 is still incomplete; menu/category/section/product availability, pricing, coupons, delivery, loyalty, and payment status policies remain candidates.
- Store availability still uses shared package schedule functions; this is intentional for frontend-safe schedule utilities, but later store/menu slices should decide whether richer backend `WeeklySchedule` and `TimeRange` value objects are needed for write-side invariants.
- `StoreService` still owns persistence access and Nest injection; Phase 4 should reduce it further behind use cases and ports.

### 2026-05-06 - Phase 2 - Product price policy

Status: Done

Changed:
- Added `apps/api/src/contexts/menu/domain/product-price.policy.ts`.
- Replaced the old `apps/api/src/utils/product-price.ts` helper with `ProductPricePolicy`, a pure menu domain policy for promotion activation and effective price selection.
- Updated products, sections, orders, and coupons services to call `ProductPricePolicy` while preserving existing public route behavior.
- Added `apps/api/test/contexts/menu/product-price.policy.test.ts` with base-price, missing-promotion-price, active-window, inclusive-boundary, inactive-window, and invalid-date coverage.
- Removed the existing `any` casts from the touched coupon option-selection pricing path by extending the local validation item shape.
- Removed `apps/api/src/contexts/menu/domain/.gitkeep` because the folder now has real domain code.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "utils/product-price" apps/api/src apps/api/test || true`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "\bas any\b|: any|as any" apps/api/src/modules/coupons/coupons.service.ts apps/api/src/contexts/menu/domain/product-price.policy.ts apps/api/test/contexts/menu/product-price.policy.test.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The domain policy has no Nest, MikroORM, entity, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- `ProductPricePolicy` owns promotion date-window behavior and effective price selection instead of leaving those rules in a generic utility file.
- The policy uses explicit member accessibility, explicit return types, constructor parameter property assignment, no `any`, and no non-null assertions.
- Existing services still own persistence, route exception translation, and response mapping; the business pricing decision moved behind the policy.
- The order pricing path still evaluates promotion timing with the current time, matching the previous helper behavior.

Risks:
- Phase 2 is still incomplete; menu/category/section availability, coupon eligibility, delivery matching, loyalty calculation, and payment status policies remain candidates.
- Product pricing still works on persistence decimal strings because existing MikroORM entities expose decimal fields as strings; a later write-model slice can introduce a richer `Money` value object.
- Coupons still contain broad eligibility logic in a Nest service; only the promotional-item exclusion and option-selection `any` casts were touched in this slice.

### 2026-05-06 - Phase 2 - Delivery area key policy

Status: Done

Changed:
- Added `apps/api/src/contexts/delivery/domain/delivery-area-key.policy.ts`.
- Moved delivery area normalized-key generation for city/neighborhood pairs behind `DeliveryAreaKeyPolicy`.
- Updated `DeliveryAreasService.create` and `DeliveryAreasService.update` to call the policy instead of calling the shared normalizer directly.
- Added `apps/api/test/contexts/delivery/delivery-area-key.policy.test.ts` with accent, hyphen, whitespace, and match coverage.
- Removed `apps/api/src/contexts/delivery/domain/.gitkeep` because the folder now has real domain code.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "normalizeNeighborhood" apps/api/src/modules/delivery-areas apps/api/src/contexts/delivery apps/api/test/contexts/delivery || true`
- `rg -n "\bas any\b|: any|as any" apps/api/src/modules/delivery-areas/delivery-areas.service.ts apps/api/src/contexts/delivery/domain/delivery-area-key.policy.ts apps/api/test/contexts/delivery/delivery-area-key.policy.test.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The domain policy imports only the shared frontend-safe string normalizer; it does not import Nest, MikroORM, entities, DTOs, queues, sockets, adapters, filesystem, or PagBank clients.
- The policy gives the delivery area key a domain name and keeps duplicate-key generation consistent across create/update.
- The policy uses explicit member accessibility, explicit return types, constructor parameter property assignment, no `any`, and no non-null assertions.
- Route contracts and persistence behavior remain unchanged; the service still owns lookup, duplicate checks, exceptions, and formatting.

Risks:
- Phase 2 is still incomplete; menu/category/section availability, coupon eligibility, loyalty calculation, and payment status policies remain candidates.
- This slice intentionally does not add stricter city/neighborhood validation because update DTOs currently allow empty strings; changing that belongs in a route-contract/DTO slice with Swagger review.
- Delivery-area matching during checkout still relies on clients sending `deliveryAreaId`; a later delivery context can add server-side address matching if needed.

### 2026-05-06 - Phase 2 - Menu availability policy

Status: Done

Changed:
- Added `apps/api/src/contexts/menu/domain/menu-availability.policy.ts`.
- Moved public menu category, section, product-in-category, and product-in-section availability decisions behind `MenuAvailabilityPolicy`.
- Updated `ProductsService` and `SectionsService` to call `MenuAvailabilityPolicy` instead of duplicating force-close, force-open, store schedule, category schedule, and section schedule rule assembly.
- Added `apps/api/test/contexts/menu/menu-availability.policy.test.ts` with force-close, forced-open, no-overlap, inactive-product, section intersection, and invalid-date coverage.
- Corrected the no-overlap unit expectation after the first test run showed the shared schedule utility returns no next label when store/category windows never overlap.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "getCombinedScheduleAvailability" apps/api/src/modules/products apps/api/src/modules/sections || true`
- `rg -n "\bas any\b|: any|as any" apps/api/src/contexts/menu/domain/menu-availability.policy.ts apps/api/test/contexts/menu/menu-availability.policy.test.ts apps/api/src/modules/products/products.service.ts apps/api/src/modules/sections/sections.service.ts || true`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The domain policy imports only shared schedule utilities and schedule types; it does not import Nest, MikroORM, entities, DTOs, queues, sockets, adapters, filesystem, or PagBank clients.
- The policy now owns availability rule composition for public menu reads while services still own persistence, response mapping, and route exceptions.
- The policy uses explicit member accessibility, explicit return types, constructor parameter property assignment, no `any`, and no non-null assertions.
- `ProductsService` and `SectionsService` no longer call `getCombinedScheduleAvailability` directly for public availability reads.
- No database query shape was changed; the fresh smoke check still returned `200` for `/api/menu` and `/api/menu/sections`.

Risks:
- Phase 2 is still incomplete; coupon eligibility, loyalty calculation, and payment status policies remain candidates.
- Order creation still has its own category availability assertion; moving that should be a stricter scheduled-order slice with focused tests because it affects order acceptance.
- `normalizeWeeklySchedule` remains in admin/sections/store write paths for schedule persistence normalization; this slice moved only read availability decisions.

### 2026-05-06 - Phase 2 - Coupon applicability policy

Status: Done

Changed:
- Added `apps/api/src/contexts/coupons/domain/coupon-applicability.policy.ts`.
- Moved pure coupon use validation, customer restriction checks, eligible-order minimum checks, and discount calculation into `CouponApplicabilityPolicy`.
- Updated `CouponsService.validateAndCalculate` to keep database lookup/counting in the service while delegating pure coupon rules and discount math to the domain policy.
- Added `apps/api/test/contexts/coupons/coupon-applicability.policy.test.ts` with inactive, date/day/time, delivery restriction, global usage, per-customer usage, first-order, minimum quantity/amount, discount cap, fixed discount cap, and invalid-date coverage.
- Removed existing non-null assertions from the touched coupon formatter by adding an explicit required-date guard.
- Removed `apps/api/src/contexts/coupons/domain/.gitkeep` because the folder now has real domain code.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "!\." apps/api/src/modules/coupons/coupons.service.ts apps/api/src/contexts/coupons/domain/coupon-applicability.policy.ts apps/api/test/contexts/coupons/coupon-applicability.policy.test.ts || true`
- `rg -n "\bas any\b|: any|as any" apps/api/src/modules/coupons/coupons.service.ts apps/api/src/contexts/coupons/domain/coupon-applicability.policy.ts apps/api/test/contexts/coupons/coupon-applicability.policy.test.ts || true`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The domain policy imports no Nest, MikroORM, entities, DTOs, queues, sockets, adapters, filesystem, PagBank clients, or shared catch-all helpers.
- `CouponApplicabilityPolicy` owns the coupon business rules while `CouponsService` still owns persistence, product/extras lookup, customer/order counting, and response assembly.
- The policy uses explicit member accessibility, explicit return types, constructor parameter property assignment, no `any`, and no non-null assertions.
- Existing failure messages and validation order were preserved for inactive, date/time/day, delivery restriction, max uses, per-customer usage, first-order, minimum quantity/amount, and no-discount cases.
- The service still uses server-side product and extras data to calculate eligible item amounts before handing totals to the policy.

Risks:
- Phase 2 is still incomplete; loyalty calculation and payment status policies remain candidates.
- Coupon product/category/section eligibility amount assembly still lives in `CouponsService` because it depends on loaded products, extras, categories, and option groups; later coupon context work can move this behind ports/read models.
- Coupon validation is still exercised here through pure policy tests and smoke only; a later API contract/use-case slice should add HTTP-level coupon validation coverage.

### 2026-05-06 - Phase 2 - Payment status policy

Status: Done

Changed:
- Added `apps/api/src/contexts/payments/domain/payment-status.policy.ts`.
- Moved gateway charge-status mapping and gateway order-status priority rules into `PaymentStatusPolicy`.
- Updated `pagbank-webhook.ts` and `PaymentsService.mapPagBankOrderStatus` to delegate pure mapping to the policy while preserving queue, gateway, persistence, logging, and WebSocket side effects in the existing adapters/services.
- Replaced the touched webhook payload `any` with `unknown` plus explicit narrowing before reading external payload fields.
- Added `apps/api/test/contexts/payments/payment-status.policy.test.ts` with single-charge mapping and multi-charge priority coverage.
- Removed `apps/api/src/contexts/payments/domain/.gitkeep` because the folder now has real domain code.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/payments/domain/payment-status.policy.ts apps/api/src/modules/payments/pagbank-webhook.ts apps/api/src/modules/payments/payments.service.ts apps/api/test/contexts/payments/payment-status.policy.test.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- `NEXT_PUBLIC_API_URL=http://localhost:3334 pnpm test:e2e tests/pagbank/pagbank-webhook.spec.ts`

Self-review:
- The domain policy imports no Nest, MikroORM, entities, DTOs, queues, sockets, adapters, filesystem, or PagBank clients.
- `PaymentStatusPolicy` owns only pure gateway status normalization and priority; transaction/application of payment state remains in the current service and processor to avoid hidden webhook behavior changes.
- The policy uses explicit member accessibility, explicit return types, no `any`, and no non-null assertions.
- The touched webhook mapper now narrows external payloads from `unknown` and keeps the existing `x-product-id` fallback behavior for empty payload ids.
- The first Playwright run used the config default API URL and hit a port/readiness mismatch; after clearing ports with `killport` and setting `NEXT_PUBLIC_API_URL=http://localhost:3334`, the targeted PagBank webhook spec passed.

Risks:
- Phase 2 is still incomplete; loyalty calculation remains a candidate.
- Payment status application is still duplicated between `PaymentsService.applyGatewayStatus` and `PaymentProcessor.applyPaymentResult`; moving that rule should be a separate stricter payment slice because it changes webhook/order state application risk.
- Webhook processing is still covered here by mapper unit tests and the existing Playwright webhook spec; a later payment context slice should add use-case or processor-level tests with fake ports.

### 2026-05-06 - Phase 2 - Loyalty points policy

Status: Done

Changed:
- Added `apps/api/src/contexts/customers/domain/loyalty-points.policy.ts`.
- Moved loyalty redemption-cost normalization, redeemability checks, manual adjustment validation/default descriptions, and earned-points calculation into `LoyaltyPointsPolicy`.
- Updated `CustomersService.getRedeemableProducts` and `CustomersService.adjustPoints` to delegate loyalty rules to the policy.
- Updated loyalty redemption and earned-points arithmetic in `OrdersService` to call the policy while leaving persistence, order creation, status changes, and transaction placement in the existing service.
- Tightened `CustomersService.adjustPoints` so the database update also enforces the non-negative balance rule atomically before returning the new balance.
- Removed the touched customer/order service `any` and non-null assertions by using a typed MikroORM filter and explicit required-date guards.
- Added `apps/api/test/contexts/customers/loyalty-points.policy.test.ts` with redeemability, adjustment, default-description, and earned-points coverage.
- Removed `apps/api/src/contexts/customers/domain/.gitkeep` because the folder now has real domain code.
- Marked Phase 2 as done because the low-risk pure-policy extraction candidates are now covered; deeper order/payment write-state movement remains in later phases.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/customers/domain/loyalty-points.policy.ts apps/api/src/modules/customers/customers.service.ts apps/api/src/modules/orders/orders.service.ts apps/api/test/contexts/customers/loyalty-points.policy.test.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The domain policy imports no Nest, MikroORM, entities, DTOs, queues, sockets, adapters, filesystem, or payment/gateway code.
- `LoyaltyPointsPolicy` owns the loyalty arithmetic and balance decision rules while services still own persistence, SQL updates, transaction timing, exceptions, and response mapping.
- The policy uses explicit member accessibility, explicit return types, constructor parameter property assignment, no `any`, and no non-null assertions.
- Existing manual adjustment descriptions and insufficient-balance messages were preserved.
- The adjustment SQL fix stays inside the touched loyalty write path and makes the documented non-negative rule true under concurrent updates.

Risks:
- Phase 3 should introduce use-case boundaries before moving more service internals.
- Order creation still owns item snapshot assembly, availability assertion, coupon integration, customer lookup, and transaction management; those belong in Phase 6 with stricter flow tests.
- Payment status application remains duplicated between payment service and webhook processor; that belongs in the later payment context phase with processor/use-case tests.

### 2026-05-06 - Phase 3 - Store status use case bridge

Status: Done

Changed:
- Added `apps/api/src/contexts/store/application/use-cases/get-store-status.use-case.ts`.
- Added `apps/api/test/contexts/store/get-store-status.use-case.test.ts` to verify immediate and scheduled status delegation.
- Updated `StoreController.getStatus` to call `GetStoreStatusUseCase` instead of calling `StoreService` directly.
- Updated `StoreModule` to provide `GetStoreStatusUseCase` through an explicit factory, keeping Nest decorators out of the application use-case class.
- Kept the existing route path, query parameter, invalid-date message, and response payload behavior unchanged.
- Read `docs/SWAGGER.md` before touching the controller. This slice did not add manual `@Api*` decorators and did not introduce DTO/schema files because Swagger is not wired yet and the route contract did not change.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application || true`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/store/application/use-cases/get-store-status.use-case.ts apps/api/src/modules/store/store.controller.ts apps/api/src/modules/store/store.module.ts apps/api/test/contexts/store/get-store-status.use-case.test.ts || true`
- `rg -n "import type" apps/api/src/modules/store/store.controller.ts apps/api/src/modules/store/store.module.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The use case has no Nest, MikroORM, DTO, controller, adapter, queue, socket, filesystem, or PagBank imports.
- The use case depends only on a typed `Pick` of the legacy store service, matching the temporary Phase 3 bridge pattern while keeping runtime Nest wiring in the module.
- The controller now uses explicit constructor accessibility and an explicit method return type.
- The controller does not use `import type`, which keeps it aligned with the Swagger guide even before Swagger is wired.
- The first unit-test run failed because the test fixture used `null` for optional result fields; the fixture was corrected to match `StoreAvailabilityResult`, then all checks passed.

Risks:
- Phase 3 is not complete; only public store status has been bridged to a use case.
- Store settings admin routes still call `StoreService` directly.
- The use case is intentionally a temporary legacy-service bridge; Phase 4 should replace it with ports/repositories around store settings.

### 2026-05-06 - Phase 3 - Public menu use case bridge

Status: Done

Changed:
- Added `apps/api/src/contexts/menu/application/use-cases/get-public-menu.use-case.ts`.
- Added `apps/api/src/contexts/menu/application/use-cases/get-featured-products.use-case.ts`.
- Added `apps/api/src/contexts/menu/application/use-cases/get-products-by-ids.use-case.ts`.
- Added `apps/api/test/contexts/menu/get-public-menu.use-case.test.ts` to verify the three public menu use cases delegate to the legacy products service.
- Updated `ProductsController` so `/api/menu`, `/api/menu/featured`, and `/api/menu/products` call use cases instead of calling `ProductsService` directly.
- Updated `ProductsModule` to provide the menu use cases through explicit factories, keeping Nest decorators out of the application use-case classes.
- Removed `apps/api/src/contexts/menu/application/use-cases/.gitkeep` because the folder now has real application code.
- Kept existing route paths, query parameters, empty-id handling, product-id limit, and response payload behavior unchanged.
- Read `docs/SWAGGER.md` before touching the controller. This slice did not add manual `@Api*` decorators and did not introduce DTO/schema files because Swagger is not wired yet and the route contracts did not change.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/menu/application/use-cases apps/api/src/modules/products/products.controller.ts apps/api/src/modules/products/products.module.ts apps/api/test/contexts/menu/get-public-menu.use-case.test.ts || true`
- `rg -n "import type" apps/api/src/modules/products/products.controller.ts apps/api/src/modules/products/products.module.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The use cases have no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, or PagBank imports.
- The use cases depend only on typed `Pick`s of the legacy products service, matching the temporary Phase 3 bridge pattern while keeping runtime Nest wiring in the module.
- The controller now uses explicit constructor accessibility and explicit method return types.
- The controller does not use `import type`, which keeps it aligned with the Swagger guide even before Swagger is wired.
- No query shape or product/menu mapping logic changed; the bridge only changes the controller dependency boundary.

Risks:
- Phase 3 is not complete; public menu sections, orders, and payments still call legacy services directly from controllers.
- These use cases are intentionally temporary legacy-service bridges; Phase 5 should replace public menu reads with ports/read models while preserving the current optimized query shape.
- Swagger response DTOs are still deferred because this repository does not yet have Swagger wired; route contracts remained stable in this slice.

### 2026-05-06 - Phase 3 - Public sections use case bridge

Status: Done

Changed:
- Added `apps/api/src/contexts/menu/application/use-cases/get-public-sections.use-case.ts`.
- Added `apps/api/test/contexts/menu/get-public-sections.use-case.test.ts` to verify public sections delegation to the legacy sections service.
- Updated `SectionsPublicController` so `/api/menu/sections` calls `GetPublicSectionsUseCase` instead of calling `SectionsService` directly.
- Updated `SectionsModule` to provide `GetPublicSectionsUseCase` through an explicit factory, keeping Nest decorators out of the application use-case class.
- Replaced the `import type` in `sections.controller.ts` with a regular import because the file contains controller and DTO metadata that must remain Swagger-visible.
- Kept existing route path, query parameter, invalid-date behavior, query shape, and response payload behavior unchanged.
- Read `docs/SWAGGER.md` before touching the controller. This slice did not add manual `@Api*` decorators and did not introduce DTO/schema files because Swagger is not wired yet and the route contract did not change.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/menu/application/use-cases/get-public-sections.use-case.ts apps/api/src/modules/sections/sections.controller.ts apps/api/src/modules/sections/sections.module.ts apps/api/test/contexts/menu/get-public-sections.use-case.test.ts || true`
- `rg -n "import type" apps/api/src/modules/sections/sections.controller.ts apps/api/src/modules/sections/sections.module.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The use case has no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, or PagBank imports.
- The use case depends only on a typed `Pick` of the legacy sections service, matching the temporary Phase 3 bridge pattern while keeping runtime Nest wiring in the module.
- The public controller constructor and public route method now use explicit access modifiers and an explicit return type.
- The controller file no longer uses `import type`, which keeps it aligned with the Swagger guide even before Swagger is wired.
- No query shape, public section mapping logic, or admin section route behavior changed.

Risks:
- Phase 3 is not complete; order and payment controllers still call legacy services directly.
- The inline admin section DTOs still predate the Swagger/OOP strictness guide; this slice avoided changing admin route contracts and should be revisited in a dedicated Swagger/DTO slice.
- This use case is intentionally a temporary legacy-service bridge; Phase 5 should replace public sections reads with a section read-model port while preserving the current optimized query shape.

### 2026-05-06 - Phase 3 - Admin store settings use case bridge

Status: Done

Changed:
- Added `apps/api/src/contexts/store/application/use-cases/get-store-settings.use-case.ts`.
- Added `apps/api/src/contexts/store/application/use-cases/update-store-settings.use-case.ts`.
- Added `apps/api/src/contexts/store/application/use-cases/toggle-store-force-close.use-case.ts`.
- Added `apps/api/src/contexts/store/application/use-cases/toggle-store-force-open.use-case.ts`.
- Added `apps/api/test/contexts/store/store-settings.use-case.test.ts` to verify settings lookup, settings update, force-close toggle, and force-open toggle delegation.
- Added `apps/api/src/modules/admin/dto/update-store-settings.dto.ts` so the admin store settings body no longer uses `any` and remains Swagger-visible through a runtime DTO class.
- Updated `AdminController` so `GET /api/admin/store-settings`, `PUT /api/admin/store-settings`, `PATCH /api/admin/store-settings/toggle-close`, and `PATCH /api/admin/store-settings/toggle-open` call store use cases instead of calling `StoreService` directly.
- Updated `StoreModule` to provide and export the new store settings use cases through explicit factories.
- Updated `AdminModule` to import `StoreModule` explicitly.
- Replaced the touched upload filter `_req: any` with `unknown`.
- Named `StoreSettingsUpdateData` in `StoreService` and allowed the existing numeric `pointsPerReal` admin payload while preserving the service's string persistence behavior.
- Read `docs/SWAGGER.md` before touching the admin controller and adding the DTO. This slice did not add manual `@Api*` decorators.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/store/application/use-cases apps/api/src/modules/admin/admin.controller.ts apps/api/src/modules/admin/admin.module.ts apps/api/src/modules/admin/dto/update-store-settings.dto.ts apps/api/src/modules/store/store.module.ts apps/api/src/modules/store/store.service.ts apps/api/test/contexts/store/store-settings.use-case.test.ts || true`
- `rg -n "import type" apps/api/src/modules/admin/admin.controller.ts apps/api/src/modules/admin/admin.module.ts apps/api/src/modules/admin/dto/update-store-settings.dto.ts apps/api/src/modules/store/store.module.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Authenticated local route check for `GET /api/admin/store-settings` returned `200`.
- Authenticated local route check for `PUT /api/admin/store-settings` with `{}` returned `200`.

Self-review:
- The new use cases have no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, or PagBank imports.
- The use cases depend only on typed `Pick`s of the legacy store service, matching the temporary Phase 3 bridge pattern while keeping runtime Nest wiring in the module.
- The touched admin store settings controller methods now use explicit access modifiers and explicit return types.
- The new DTO uses class-validator decorators, regular imports, explicit public readonly fields, and no manual Swagger decorators.
- The force-close and force-open orchestration moved out of the controller into use cases, while the legacy service still owns persistence and mutual-exclusion behavior.

Risks:
- Phase 3 is not complete; order and payment controllers still call legacy services directly.
- The admin store settings `PUT` route now uses a DTO instead of `any`; current admin UI fields are covered, but a future Swagger slice should add explicit response DTOs and document nullable receipt fields deliberately.
- The store settings use cases are intentionally temporary legacy-service bridges; Phase 4 should replace them with ports/repositories and explicit write transaction boundaries.

### 2026-05-06 - Phase 3 - Orders controller use case bridge

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/use-cases/create-order.use-case.ts`.
- Added `apps/api/src/contexts/orders/application/use-cases/change-order-status.use-case.ts`.
- Added `apps/api/src/contexts/orders/application/use-cases/get-kitchen-orders.use-case.ts`.
- Added `apps/api/src/contexts/orders/application/use-cases/get-order-details.use-case.ts`.
- Added `apps/api/test/contexts/orders/order-use-case-bridge.test.ts` to verify order creation, kitchen lookup, detail lookup, and status-change delegation.
- Updated `OrdersController` so `POST /api/orders`, `GET /api/orders/kitchen`, `GET /api/orders/:id`, and `PATCH /api/orders/:id/status` call use cases instead of calling `OrdersService` directly.
- Updated `OrdersModule` to provide and export the order use cases through explicit factories, keeping Nest decorators out of the application use-case classes.
- Kept existing route paths, guards, headers, body DTOs, response payloads, order creation behavior, kitchen query behavior, detail lookup behavior, and status-change behavior unchanged.
- Read `docs/SWAGGER.md` before touching the controller. This slice did not add manual `@Api*` decorators and did not introduce DTO/schema files because Swagger is not wired yet and the route contracts did not change.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/orders/application/use-cases apps/api/src/modules/orders/orders.controller.ts apps/api/src/modules/orders/orders.module.ts apps/api/test/contexts/orders/order-use-case-bridge.test.ts || true`
- `rg -n "import type" apps/api/src/modules/orders/orders.controller.ts apps/api/src/modules/orders/orders.module.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local order creation check against the fresh API returned `201` and created local order `#2`.

Self-review:
- The new use cases have no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, or PagBank imports.
- The use cases depend only on typed `Pick`s of the legacy order service, matching the temporary Phase 3 bridge pattern while keeping runtime Nest wiring in the module.
- The touched order controller methods now use explicit access modifiers and explicit return types.
- The order controller does not use `import type`, which keeps it aligned with the Swagger guide even before Swagger is wired.
- No order pricing, availability, scheduling, coupon, customer, persistence, payment, socket, kitchen query, or status-transition behavior was moved or rewritten in this slice.

Risks:
- Phase 3 is not complete; payment controllers still call legacy services directly.
- These order use cases are intentionally temporary legacy-service bridges; Phase 6 should replace order creation/status internals with ports, rich domain objects, and explicit transaction boundaries.
- The local order creation verification intentionally mutated only the local database by creating order `#2`.

### 2026-05-06 - Phase 3 - Payment controller use case bridge

Status: Done

Changed:
- Added `apps/api/src/contexts/payments/application/use-cases/create-pix-payment.use-case.ts`.
- Added `apps/api/src/contexts/payments/application/use-cases/create-card-payment.use-case.ts`.
- Added `apps/api/src/contexts/payments/application/use-cases/create-debit-card-payment.use-case.ts`.
- Added `apps/api/src/contexts/payments/application/use-cases/create-payment-3ds-session.use-case.ts`.
- Added `apps/api/src/contexts/payments/application/use-cases/get-payment-status.use-case.ts`.
- Added `apps/api/test/contexts/payments/payment-use-case-bridge.test.ts` to verify Pix, credit-card, debit-card, 3DS-session, and status lookup delegation.
- Updated `PaymentsController` so `POST /api/payments/pix`, `POST /api/payments/credit-card`, `POST /api/payments/3ds-session`, `POST /api/payments/debit-card`, and `GET /api/payments/:orderId/status` call use cases instead of calling `PaymentsService` directly.
- Updated `PaymentsModule` to provide and export the payment use cases through explicit factories, keeping Nest decorators out of the application use-case classes.
- Removed `apps/api/src/contexts/payments/application/use-cases/.gitkeep` because the folder now has real application code.
- Kept existing route paths, body DTOs, response payloads, gateway calls, payment status synchronization, evidence logging, order mutation behavior, and payment service internals unchanged.
- Read `docs/SWAGGER.md` before touching the controller. This slice did not add manual `@Api*` decorators and did not introduce DTO/schema files because Swagger is not wired yet and the route contracts did not change.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/payments/application/use-cases apps/api/src/modules/payments/payments.controller.ts apps/api/src/modules/payments/payments.module.ts apps/api/test/contexts/payments/payment-use-case-bridge.test.ts || true`
- `rg -n "import type" apps/api/src/modules/payments/payments.controller.ts apps/api/src/modules/payments/payments.module.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The new use cases have no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, or concrete PagBank imports.
- The use cases depend only on typed `Pick`s of the legacy payment service, matching the temporary Phase 3 bridge pattern while keeping runtime Nest wiring in the module.
- The touched payment controller methods now use explicit access modifiers and explicit return types.
- The payment controller does not use `import type`, which keeps it aligned with the Swagger guide even before Swagger is wired.
- No payment gateway payload mapping, gateway request timing, status mapping, status application, evidence redaction, queue behavior, or webhook behavior was moved or rewritten in this slice.
- The first self-review found the obsolete payment use-case `.gitkeep`; it was removed, then verification and scans were rerun successfully.

Risks:
- Phase 3 is not complete; `WebhookController` still owns PagBank webhook signature checks, job mapping, and queue enqueue behavior directly.
- These payment use cases are intentionally temporary legacy-service bridges; Phase 7 should replace payment internals with gateway, webhook verifier, and queue ports.
- The smoke check covered the bridged Pix route validation path but did not call the real PagBank gateway.

### 2026-05-07 - Phase 3 - PagBank webhook use case bridge

Status: Done

Changed:
- Added `apps/api/src/contexts/payments/application/ports/payment-webhook-settings.port.ts`.
- Added `apps/api/src/contexts/payments/application/ports/payment-webhook-signature-verifier.port.ts`.
- Added `apps/api/src/contexts/payments/application/ports/payment-webhook-job-factory.port.ts`.
- Added `apps/api/src/contexts/payments/application/ports/payment-webhook-queue.port.ts`.
- Added `apps/api/src/contexts/payments/application/use-cases/handle-pagbank-webhook.use-case.ts`.
- Added `apps/api/test/contexts/payments/handle-pagbank-webhook.use-case.test.ts` with fake ports for invalid signature, missing production token, valid enqueue, and ignored-payload behavior.
- Updated `WebhookController` so `POST /api/webhooks/pagbank` delegates signature, payload mapping, and enqueue orchestration to `HandlePagBankWebhookUseCase`.
- Updated `PaymentsModule` to wire the webhook use case to the existing ConfigService, PagBank webhook helper functions, and BullMQ queue through port-shaped inline adapters.
- Removed `apps/api/src/contexts/payments/application/ports/.gitkeep` because the folder now has real port definitions.
- Kept the existing route path, HTTP status, missing-token production behavior, invalid-signature behavior, no-op ignored payload behavior, BullMQ job contract, and PagBank webhook helper behavior unchanged.
- Read `docs/SWAGGER.md` before touching the controller. This slice did not add manual `@Api*` decorators and did not introduce DTO/schema files because Swagger is not wired yet and the route contract did not change.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/payments/application/ports apps/api/src/contexts/payments/application/use-cases/handle-pagbank-webhook.use-case.ts apps/api/src/modules/payments/webhook.controller.ts apps/api/src/modules/payments/payments.module.ts apps/api/test/contexts/payments/handle-pagbank-webhook.use-case.test.ts || true`
- `rg -n "import type" apps/api/src/modules/payments/webhook.controller.ts apps/api/src/modules/payments/payments.module.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- `NEXT_PUBLIC_API_URL=http://localhost:3334 pnpm test:e2e tests/pagbank/pagbank-webhook.spec.ts`

Self-review:
- The new use case and ports have no Nest, MikroORM, entity, DTO, controller, adapter, queue implementation, socket, filesystem, ConfigService, or concrete PagBank client imports.
- The use case owns webhook orchestration while the module remains the composition root for ConfigService, existing helper functions, and the BullMQ queue.
- The touched webhook controller now uses explicit constructor accessibility, explicit method return type, `unknown` for external payload/request values, and a narrow raw-body extractor instead of `any`.
- The webhook controller does not use `import type`, which keeps it aligned with the Swagger guide even before Swagger is wired.
- The first unit run exposed a test-harness bug where explicit `job: null` was replaced by a default job; the harness was fixed, the TypeScript narrowing issue from that fix was corrected, and the full verification was rerun successfully.

Risks:
- The webhook job mapping and BullMQ enqueue contract still live in legacy helper functions; Phase 7 should move those into concrete adapters behind the new ports.
- Payment status application still remains in `PaymentsService.applyGatewayStatus` and `PaymentProcessor.applyPaymentResult`; that duplication should be handled in the later payment context phase with transaction/idempotency tests.
- The targeted Playwright spec verifies webhook signature/mapping/enqueue helper behavior, while local smoke verifies the HTTP no-op route; it does not process a real queued payment against a real PagBank gateway.

### 2026-05-07 - Phase 4 - Store status repository slice

Status: Done

Changed:
- Added `apps/api/src/shared/application/clock/clock.port.ts`.
- Added `apps/api/src/contexts/store/application/ports/store-settings.repository.port.ts`.
- Added `apps/api/src/contexts/store/domain/store-schedule.value-object.ts`.
- Added `apps/api/src/contexts/store/adapters/persistence/mikro-orm-store-settings.repository.ts`.
- Updated `GetStoreStatusUseCase` so store status reads go through `StoreSettingsRepository`, `Clock`, `StoreSchedule`, and `StoreAvailabilityPolicy` instead of delegating to `StoreService.isOpen`.
- Updated `StoreModule` to wire `GetStoreStatusUseCase` to `MikroOrmStoreSettingsRepository` and a system clock through explicit factories.
- Updated `apps/api/test/contexts/store/get-store-status.use-case.test.ts` from legacy-service delegation coverage to fake repository/clock behavior coverage.
- Added `apps/api/test/contexts/store/store-schedule.value-object.test.ts` for weekly schedule preference, legacy schedule fallback, and empty schedule behavior.
- Removed `apps/api/src/contexts/store/application/ports/.gitkeep` and `apps/api/src/shared/application/clock/.gitkeep` because those folders now have real code.
- Kept `/api/store/status` route behavior and admin store settings behavior unchanged.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/store/application/ports apps/api/src/contexts/store/application/use-cases/get-store-status.use-case.ts apps/api/src/contexts/store/domain/store-schedule.value-object.ts apps/api/src/contexts/store/adapters/persistence/mikro-orm-store-settings.repository.ts apps/api/src/shared/application/clock/clock.port.ts apps/api/src/modules/store/store.module.ts apps/api/test/contexts/store/get-store-status.use-case.test.ts apps/api/test/contexts/store/store-schedule.value-object.test.ts || true`
- `rg -n "import type" apps/api/src/modules/store/store.module.ts || true`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- `GetStoreStatusUseCase` no longer imports or depends on the legacy store service, Nest, MikroORM, entities, controllers, DTOs, adapters, queues, sockets, filesystem, or PagBank code.
- Store effective-schedule fallback is now encapsulated in `StoreSchedule` instead of living in the legacy service path for this route.
- The repository adapter is the only new code in this slice that imports MikroORM/entities, keeping persistence concerns outside domain/application.
- The first typecheck found that the adapter `save()` creation path did not provide required entity fields; it was fixed and all verification was rerun.
- A later unit run hit a transient Node/V8 fatal crash while loading the new store schedule test; the targeted test passed immediately afterward and the full unit suite passed on rerun.

Risks:
- Phase 4 is not complete; admin store settings use cases still delegate to `StoreService`, and `StoreService` is still used by orders, products, and sections.
- `MikroOrmStoreSettingsRepository.save()` is added for the upcoming settings write slice but is not yet used by a write use case.
- Store settings caching is still deferred; this slice preserves the existing one settings read for `/api/store/status`.

### 2026-05-07 - Phase 4 - Store settings writes repository slice

Status: Done

Changed:
- Added `apps/api/src/contexts/store/domain/store-mode.value-object.ts`.
- Added `apps/api/src/contexts/store/application/use-cases/set-store-mode.use-case.ts`.
- Updated `GetStoreSettingsUseCase`, `UpdateStoreSettingsUseCase`, `ToggleStoreForceCloseUseCase`, and `ToggleStoreForceOpenUseCase` so admin store settings reads/writes use `StoreSettingsRepository` instead of the legacy `StoreService`.
- Updated `UpdateStoreSettingsUseCase` to preserve existing partial update behavior, including `pointsPerReal` string persistence, weekly-schedule normalization, and manual mode mutual exclusion.
- Fixed the no-op update path so `PUT /api/admin/store-settings` with `{}` returns current settings without calling `save()` or normalizing/persisting unchanged fields.
- Updated `StoreModule` so store settings use cases are wired to `MikroOrmStoreSettingsRepository`.
- Updated `apps/api/test/contexts/store/store-settings.use-case.test.ts` with fake repository coverage for settings reads, settings writes, set-mode behavior, toggles, and `StoreMode` invariants.
- Removed `apps/api/src/contexts/store/application/use-cases/.gitkeep` because the folder has real use-case files.
- Kept admin store settings routes, DTOs, request bodies, and response keys stable.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/contexts/store/domain/store-mode.value-object.ts apps/api/src/contexts/store/application/use-cases/get-store-settings.use-case.ts apps/api/src/contexts/store/application/use-cases/update-store-settings.use-case.ts apps/api/src/contexts/store/application/use-cases/set-store-mode.use-case.ts apps/api/src/contexts/store/application/use-cases/toggle-store-force-close.use-case.ts apps/api/src/contexts/store/application/use-cases/toggle-store-force-open.use-case.ts apps/api/src/modules/store/store.module.ts apps/api/test/contexts/store/store-settings.use-case.test.ts`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Authenticated local route check for `GET /api/admin/store-settings` returned `200` with the expected settings keys.
- Authenticated local route check for `PUT /api/admin/store-settings` with `{}` returned `200` with the expected settings keys.

Self-review:
- Store settings application use cases no longer import or depend on `StoreService`, Nest, MikroORM, entities, controllers, DTOs, adapters, queues, sockets, filesystem, or PagBank code.
- `StoreMode` owns the manual force-open/force-close invariant and preserves the legacy admin update field order when both flags are sent.
- `StoreModule` remains the composition root for binding the repository adapter to application use cases.
- The repository adapter is still the only new store settings code that imports MikroORM/entities.
- The first self-review found that the repository-backed `PUT {}` path would still call `save()` and could persist a normalized schedule even when no fields changed; the use cases now return current settings without saving when the command is empty, and verification was rerun.
- Admin route contracts were not changed; the slice changed use-case internals and module wiring only.

Risks:
- Phase 4 is still not complete; `StoreService` remains in use by orders, products, and sections for effective schedule and availability helpers.
- Store settings writes still rely on MikroORM's normal flush behavior for this single-row update; a generic unit-of-work port remains deferred until a broader write-transaction slice.
- Store settings caching remains deferred; repository reads are still one database lookup per settings/status request.

### 2026-05-07 - Phase 4 - Store service adapter facade

Status: Done

Changed:
- Updated `apps/api/src/modules/store/store.service.ts` so it no longer imports `EntityManager`, MikroORM entities, or store settings write/update behavior.
- `StoreService` now delegates settings reads through the `StoreSettingsRepository` interface while using the existing `MikroOrmStoreSettingsRepository` Nest provider token.
- Kept the legacy facade methods still used by products, sections, and orders: `getSettings`, `getEffectiveSchedule`, `isOpen`, and `getScheduleSummary`.
- Removed the obsolete `StoreSettingsUpdateData` and `StoreService.updateSettings` path; admin store settings writes already use store application use cases.
- Added `apps/api/test/contexts/store/store-service-adapter.test.ts` for repository-backed settings reads, effective schedule fallback, immediate availability, and scheduled availability ignoring force-open.
- Marked Phase 4 as done because store settings/status behavior now lives in store domain/application/repository code, and `StoreService` is reduced to an adapter compatibility facade for legacy callers.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\." apps/api/src/modules/store/store.service.ts apps/api/test/contexts/store/store-service-adapter.test.ts`
- `rg -n "StoreSettingsUpdateData|updateSettings\(" apps/api/src apps/api/test`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- `StoreService` is now a Nest adapter facade and does not own persistence access, settings writes, or schedule math.
- Store schedule fallback remains encapsulated in `StoreSchedule`; store open/closed behavior remains encapsulated in `StoreAvailabilityPolicy`.
- Existing products, sections, and orders service calls remain stable; this slice did not move public menu read models or order write rules.
- The fresh smoke check covered `/api/store/status`, `/api/menu`, `/api/menu/sections`, invalid order creation, invalid Pix payment creation, and the PagBank webhook no-op path after the Nest DI change.

Risks:
- Phase 5 still needs to replace public menu reads with read repositories instead of legacy products/sections services.
- Phase 6 still needs to move order acceptance and scheduled-order validation out of `OrdersService`.
- Store settings caching remains deferred; repository reads are still one database lookup per settings/status/menu availability request.

### 2026-05-07 - Phase 5 - Product read repository slice

Status: Done

Changed:
- Added `apps/api/src/contexts/menu/application/read-models/product.read-model.ts`.
- Added `apps/api/src/contexts/menu/application/ports/menu-read-repository.port.ts`.
- Added `apps/api/src/contexts/menu/adapters/persistence/mikro-orm-menu.read-repository.ts`.
- Updated `GetFeaturedProductsUseCase` and `GetProductsByIdsUseCase` so `/api/menu/featured` and `/api/menu/products` read through `MenuReadRepository` instead of the legacy `ProductsService`.
- Updated `ProductsModule` to wire the use cases to `MikroOrmMenuReadRepository`.
- Added `STORE_SETTINGS_REPOSITORY` as the store settings repository DI token and updated `StoreModule`/`StoreService` to use and export that token.
- Updated menu use-case tests with a fake `MenuReadRepository`.
- Removed obsolete menu `.gitkeep` placeholders from directories that now contain real read-model, port, and persistence adapter files.
- Kept `/api/menu/featured` and `/api/menu/products` route paths, query parameters, invalid scheduled-time behavior, query population shape, ordering, and response keys stable.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the touched menu read-model, port, adapter, use cases, module wiring, store token wiring, and menu use-case test files.
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `GET /api/menu/featured` returned `200` with an array response.
- Local route check for `GET /api/menu/products?ids=<existingProductId>` returned `200` with the expected product response keys.

Self-review:
- The new menu application port and read model have no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, or PagBank imports.
- The MikroORM read adapter is the only new menu-read file that imports MikroORM/entities, keeping persistence concerns outside domain/application.
- The read adapter preserves the legacy eager loading for extras, category, option groups, and options to avoid introducing N+1 queries.
- The first self-review found that the persistence adapter filename did not match the documented `*.read-repository.ts` suffix; it was renamed and verification was rerun.
- The first route-check script used top-level `await` without module input; the HTTP check was rerun with `node --input-type=module` and passed.

Risks:
- Phase 5 is not complete; `/api/menu` still uses the legacy `ProductsService.getMenu` bridge and `/api/menu/sections` still uses the legacy `SectionsService` bridge.
- The menu read adapter still performs one store-settings read per use case call; caching remains deferred until menu-read boundaries are stable.
- Next recommended slice is to move the full `/api/menu` category read into the menu read repository with a `MenuReadModel`, while preserving the current category/product eager-loading shape.

### 2026-05-07 - Phase 5 - Public menu read repository slice

Status: Done

Changed:
- Added `apps/api/src/contexts/menu/application/read-models/menu.read-model.ts`.
- Extended `MenuReadRepository` with `getMenu(query)`.
- Updated `MikroOrmMenuReadRepository` so `/api/menu` uses the menu read repository instead of `ProductsService.getMenu`.
- Updated `GetPublicMenuUseCase` to depend on `MenuReadRepository`.
- Updated `ProductsModule` to wire `GetPublicMenuUseCase` to `MikroOrmMenuReadRepository`.
- Updated menu use-case tests so public menu, featured products, and products-by-id all use a fake `MenuReadRepository`.
- Kept the `/api/menu` route, query parameter, invalid scheduled-time behavior, category response keys, product response keys, eager population shape, and category/product ordering stable.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the touched menu read-model, port, adapter, public menu use case, module wiring, and use-case test files.
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `GET /api/menu` returned `200`, array length `6`, category keys `availabilityMessage`, `availabilitySchedule`, `description`, `id`, `imageUrl`, `isAvailable`, `name`, `nextAvailableAt`, `products`, and the expected product keys.
- Local route check for `GET /api/menu?scheduledFor=2026-05-06T12:00:00-03:00` returned `200`, array length `6`.
- Local `/api/menu` timings after the fresh boot were `0.219438s`, `0.217076s`, and `0.209186s`, staying close to the Phase 0 baseline.

Self-review:
- `GetPublicMenuUseCase` no longer imports or depends on `ProductsService`, Nest, MikroORM, entities, controllers, DTOs, adapters, queues, sockets, filesystem, or PagBank code.
- The new `MenuReadModel` is a read projection, not a rich aggregate or Swagger DTO.
- The read adapter preserves the legacy `Category` eager load with nested product extras, option groups, and options to avoid N+1 query risk.
- The first unit-test run found that the test fixture declared `sampleCategory` before `sampleProduct`; the fixture order was fixed and the full verification loop was rerun successfully.
- The public controller was not changed in this slice; Swagger DTO/route contract work remains deferred until a dedicated Swagger slice.

Risks:
- Phase 5 is still not complete; `/api/menu/sections` still uses the legacy `SectionsService` bridge.
- `ProductsService.getMenu`, `getFeatured`, and `getProductsByIds` remain for legacy/admin callers and should be removed only when no callers remain.
- Next recommended slice is to move `/api/menu/sections` into a `SectionReadRepository` and `SectionReadModel`, after checking for a non-empty local sections fixture or documenting that the current local payload remains empty.

### 2026-05-07 - Phase 5 - Public sections read repository slice

Status: Done

Changed:
- Added `apps/api/src/contexts/menu/application/read-models/section.read-model.ts`.
- Added `apps/api/src/contexts/menu/application/ports/section-read-repository.port.ts`.
- Added `apps/api/src/contexts/menu/adapters/persistence/mikro-orm-section.read-repository.ts`.
- Updated `GetPublicSectionsUseCase` to depend on `SectionReadRepository`.
- Updated `SectionsModule` to wire `GetPublicSectionsUseCase` to `MikroOrmSectionReadRepository`.
- Updated public sections use-case tests with a fake `SectionReadRepository`.
- Marked Phase 5 as done because `/api/menu`, `/api/menu/featured`, `/api/menu/products`, and `/api/menu/sections` now read through read-model repositories and use cases while preserving public routes.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the touched section read-model, port, adapter, public sections use case, module wiring, and use-case test files.
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `GET /api/menu/sections` returned `200`, array length `0`, matching the Phase 0 local baseline.
- Local route check for `GET /api/menu/sections?scheduledFor=2026-05-06T12:00:00-03:00` returned `200`, array length `0`.
- Local `/api/menu/sections` timings after the fresh boot were `0.009186s`, `0.008450s`, and `0.007679s`, staying close to the Phase 0 baseline.

Self-review:
- `GetPublicSectionsUseCase` no longer imports or depends on `SectionsService`, Nest, MikroORM, entities, controllers, DTOs, adapters, queues, sockets, filesystem, or PagBank code.
- The new `SectionReadModel` is a read projection, not a rich aggregate or Swagger DTO.
- The read adapter preserves the legacy section eager load for `products.product.extras` and `products.product.category`.
- Local data still has no public sections, so shape verification for non-empty section items remains covered by use-case fake-port tests and by preserving the legacy mapper structure in the adapter.
- The public sections controller was not changed in this slice; Swagger DTO/route contract work remains deferred until a dedicated Swagger slice.

Risks:
- `SectionsService.listPublic` remains for legacy cleanup and should be removed only after confirming no callers remain.
- Store/menu read caching remains deferred; read repositories still load store settings per use-case call.
- Next recommended slice is Phase 6, but order creation/status work is high-risk and should start with a narrow order read/status or transaction-boundary preparation slice plus focused tests before moving the full create-order flow.

### 2026-05-07 - Phase 6 - Order read repository slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/read-models/order.read-model.ts`.
- Added `apps/api/src/contexts/orders/application/ports/order-read-repository.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/mikro-orm-order.read-repository.ts`.
- Updated `GetKitchenOrdersUseCase` and `GetOrderDetailsUseCase` so kitchen order reads and order details reads use `OrderReadRepository` instead of the legacy `OrdersService`.
- Updated `OrdersModule` so only order creation and status changes still use the legacy `OrdersService` bridge; order read use cases now use `MikroOrmOrderReadRepository`.
- Updated order use-case bridge tests with a fake `OrderReadRepository`.
- Removed `apps/api/src/contexts/orders/application/ports/.gitkeep` because the folder now has a real port file.
- Kept order read routes, auth behavior, response keys, eager population shape, kitchen status filter, and kitchen ordering stable.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the touched order read-model, port, adapter, read use cases, module wiring, and use-case test files.
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Authenticated local route check for `GET /api/orders/kitchen` returned `200` with an array response and the expected order response keys.
- Authenticated local route check for `GET /api/orders/:id` using a kitchen order id returned `200` with the expected order response keys.

Self-review:
- `GetKitchenOrdersUseCase` and `GetOrderDetailsUseCase` no longer import or depend on `OrdersService`, Nest, MikroORM, entities, controllers, DTOs, adapters, queues, sockets, filesystem, or PagBank code.
- The new `OrderReadModel` is a read projection, not a rich aggregate or Swagger DTO.
- The read adapter preserves the legacy kitchen status filter, creation ordering, item mapping, detail lookup `NotFoundException`, and date serialization behavior.
- The adapter is the only new order-read file that imports Nest/MikroORM/entities, keeping persistence concerns outside domain/application.
- The first authenticated route-check script looked for `access_token`; the existing login response key is `accessToken`, so the script was fixed and route verification was rerun successfully.
- Controllers and DTOs were not changed in this slice; Swagger route-contract work remains deferred until a dedicated Swagger slice.

Risks:
- Phase 6 is not complete; order creation and status changes still delegate to `OrdersService`.
- Order creation still owns item snapshot assembly, availability checks, coupon validation, customer lookup, loyalty redemption, and transaction management in the legacy service.
- Status changes still combine persistence, loyalty crediting, and websocket notification in the legacy service; the next recommended slice is a narrow status-change port/domain-policy slice with focused tests before attempting full order creation.

### 2026-05-07 - Phase 6 - Order status transaction slice

Status: Done

Changed:
- Added `apps/api/src/shared/application/unit-of-work/unit-of-work.port.ts`.
- Added `apps/api/src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work.ts`.
- Added `apps/api/src/contexts/orders/application/ports/order-status-repository.port.ts`.
- Added `apps/api/src/contexts/orders/application/ports/order-realtime-notifier.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/mikro-orm-order-status.repository.ts`.
- Added `apps/api/src/contexts/orders/adapters/realtime/socket-io-order-realtime.notifier.ts`.
- Extracted `apps/api/src/contexts/orders/adapters/persistence/order-read-model.mapper.ts` and reused it from order read/status persistence adapters.
- Updated `ChangeOrderStatusUseCase` so manual status changes use a unit-of-work, `OrderStatusRepository`, `OrderStatusTransitionPolicy`, `LoyaltyPointsPolicy`, and `OrderRealtimeNotifier` instead of the legacy `OrdersService`.
- Updated `OrdersController` to translate application status errors to the existing `404`/`400` HTTP exceptions without changing the route path, request DTO, response keys, or adding manual Swagger decorators.
- Updated `OrdersModule` to wire the status use case to `MikroOrmUnitOfWork`, `MikroOrmOrderStatusRepository`, and `SocketIoOrderRealtimeNotifier`.
- Added `apps/api/test/contexts/orders/change-order-status.use-case.test.ts` with fake-port coverage for transaction ordering, missing orders, invalid transitions, post-commit notification, registered-customer delivered loyalty crediting, and unregistered delivered orders.
- Removed obsolete `.gitkeep` files from orders persistence/realtime/use-case folders and shared unit-of-work/MikroORM folders.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the touched status use case, ports, adapters, module/controller, shared unit-of-work files, mapper, and tests.
- `rg -n "import type" apps/api/src/modules/orders/orders.controller.ts apps/api/src/modules/orders/orders.module.ts`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Authenticated local status route check for `PATCH /api/orders/:id/status` returned `200`, moved local order `2fb6d440-14f0-4e94-a3b7-b883f452e39e` from `preparing` to `ready`, and preserved the expected response keys.
- Fresh API logs showed `begin`, `for update`, status `update`, status transition log, and `commit` for the patched status route.

Self-review:
- `ChangeOrderStatusUseCase` no longer imports or depends on `OrdersService`, Nest, MikroORM, entities, controllers, DTOs, adapters, queues, sockets, filesystem, or PagBank code.
- The status transition rule remains in `OrderStatusTransitionPolicy`; the delivered-order loyalty calculation remains in `LoyaltyPointsPolicy`; the use case orchestrates loading, validation, persistence, loyalty crediting, final read-model mapping, and post-commit notification.
- The new unit-of-work port keeps application code persistence-ignorant while the MikroORM adapter owns the concrete transaction context.
- WebSocket status notification now happens after the unit-of-work resolves, improving the previous best-effort ordering where notification happened after persistence and loyalty attempts in the legacy service.
- The first unit run found a fake-repository fixture bug where delivered transitions still returned a `preparing` notification; the harness was fixed and the full unit suite was rerun.
- Self-review found the status transition log had been dropped from the moved path; adapter logging was added and verification was rerun.
- A watch-mode server restart hit `EADDRINUSE`; the server was reset with `killport`, booted fresh, and smoke/status checks were rerun.
- The controller was touched only for error translation; `docs/SWAGGER.md` was re-read first, no DTOs changed, no `import type` was added to controller/module files, and no manual `@Api*` decorators were introduced.

Risks:
- Phase 6 is not complete; order creation still delegates to `OrdersService` and owns the largest write-flow risk.
- The authenticated route check covered a normal non-delivered status transition; delivered loyalty behavior is covered by fake-port use-case tests and should get an adapter/API-level check when a registered-customer fixture is available.
- `OrdersService.updateStatus` remains as dead legacy code until cleanup confirms no remaining callers.
- Next recommended slice is order creation transaction preparation: introduce order-creation write ports/models around product catalog lookup, customer lookup, daily sequence, and order persistence without moving the full create flow in one step.

### 2026-05-07 - Phase 6 - Scheduled order policy slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/domain/scheduled-order.policy.ts`.
- Added `apps/api/test/contexts/orders/scheduled-order.policy.test.ts`.
- Updated `OrdersService.create` so scheduled-order parsing, target-date selection, invalid-date rejection, past-date rejection, and the existing one-minute grace window are delegated to `ScheduledOrderPolicy`.
- Preserved the existing `Horário agendado inválido` and `Horário agendado já passou` API error messages.
- Kept controllers, DTOs, routes, Swagger decorators, payment code, persistence code, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against `scheduled-order.policy.ts`, `orders.service.ts`, and `scheduled-order.policy.test.ts`.
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/orders` with `scheduledFor: "not-a-date"` returned `400` with `Horário agendado inválido`.
- Local route check for `POST /api/orders` with `scheduledFor: "2020-01-01T00:00:00.000Z"` returned `400` with `Horário agendado já passou`.

Self-review:
- `ScheduledOrderPolicy` has no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, or PagBank imports.
- The policy is a rich domain object for scheduled-order validation and target-date resolution; `OrdersService` only translates policy failure into the existing Nest `BadRequestException`.
- The focused unit tests cover immediate orders, null scheduled orders, invalid dates, dates outside the grace window, dates inside the grace window, future dates, and invalid policy clock input.
- No Swagger files were touched because controllers, DTOs, and routes were not changed in this slice.
- No code fixes were needed after self-review; verification had already passed against the intended scope.

Risks:
- Phase 6 is not complete; order creation still owns product lookup, item snapshot assembly, coupon validation, customer lookup, loyalty redemption, daily counter allocation, and persistence inside `OrdersService`.
- Store/category/product availability checks during order creation are still partially legacy and should be moved behind order-creation ports/policies in smaller slices.
- Next recommended slice is order creation transaction preparation: introduce application ports/models for product catalog lookup and order item snapshot inputs before moving persistence.

### 2026-05-07 - Phase 6 - Order item snapshot policy slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/domain/order-item-snapshot.policy.ts`.
- Added `apps/api/test/contexts/orders/order-item-snapshot.policy.test.ts`.
- Updated `OrdersService.create` so active-product rejection, flat-extra validation, compound option validation, required compound group validation, unit price plus extras calculation, and subtotal calculation are delegated to `OrderItemSnapshotPolicy`.
- Kept product lookup, category availability checks, customer lookup, daily sequence allocation, order persistence, coupon validation, delivery fee lookup, loyalty redemption, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.
- Preserved the existing item-selection API error messages for unavailable products, missing extras, missing option groups, missing options, min/max option selection, and required compound groups.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against `order-item-snapshot.policy.ts`, `orders.service.ts`, and `order-item-snapshot.policy.test.ts`.
- `rg -n "contexts/.*/domain" apps/api/src/contexts/orders/domain/order-item-snapshot.policy.ts`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/orders` with a valid scheduled compound product returned `201` and created local order `#5`.
- Local route check for `POST /api/orders` with an invalid `extraIds` entry returned `400` with `Extra 22222222-2222-4222-8222-222222222222 not found or unavailable`.

Self-review:
- `OrderItemSnapshotPolicy` has no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, PagBank, or cross-context domain imports.
- The policy owns item snapshot rules and emits a domain error; `OrdersService` only maps that error to the existing Nest `BadRequestException`.
- The focused unit tests cover flat extras, compound grouped options, unavailable products, missing extras, missing option groups, max selections, required groups, and the legacy behavior where compound products without option selections can still be ordered.
- The first self-review found a cross-context domain import from orders domain to menu domain pricing. That was fixed by passing the resolved base unit price into the order item snapshot policy, and the full verification loop plus fresh HTTP checks were rerun.
- No Swagger files were touched because controllers, DTOs, and routes were not changed in this slice.

Risks:
- Phase 6 is not complete; order creation still owns product lookup, customer lookup, daily counter allocation, delivery fee lookup, coupon validation, loyalty redemption, and persistence inside `OrdersService`.
- The HTTP verification intentionally mutated only the local database by creating local order `#5` and by exercising the legacy invalid-extra path, which still allocates the daily counter and auto-creates the customer before rejecting the item.
- Next recommended slice is to introduce an `OrderProductCatalogRepository` application port and MikroORM adapter so product lookup and entity-to-orderable-product mapping leave `OrdersService` without moving full order persistence yet.

### 2026-05-07 - Phase 6 - Order product catalog port slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/ports/order-product-catalog.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/mikro-orm-order-product-catalog.repository.ts`.
- Updated `OrdersService.create` so normal order products and loyalty redemption products are loaded through `OrderProductCatalogRepository` instead of direct `em.find(Product, ...)` calls.
- Updated `OrdersModule` to wire `ORDER_PRODUCT_CATALOG_REPOSITORY` to `MikroOrmOrderProductCatalogRepository`.
- Removed direct `Product` entity usage from `OrdersService`; entity-to-orderable-product mapping now lives in the persistence adapter.
- Preserved the existing normal product lookup populate shape: `category`, `extras`, `optionGroups`, and `optionGroups.options`.
- Preserved the existing redeemed product lookup populate shape: `category` only.
- Kept customer lookup, category availability checks, item snapshot rules, daily sequence allocation, order persistence, coupon validation, delivery fee lookup, loyalty redemption writes, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the product catalog port, product catalog adapter, `orders.service.ts`, and `orders.module.ts`.
- `rg -n "import type" apps/api/src/modules/orders/orders.module.ts`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/orders` with a valid scheduled compound product returned `201` and created local order `#7`.
- Local route check for `POST /api/orders` with an invalid `extraIds` entry returned `400` with `Extra 22222222-2222-4222-8222-222222222222 not found or unavailable`.

Self-review:
- `OrderProductCatalogRepository` and its models have no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- The MikroORM adapter is the only new file in this slice that imports MikroORM/entities, keeping persistence concerns outside domain/application.
- `OrdersService` now receives the product catalog through constructor parameter-property dependency injection and keeps only orchestration plus legacy HTTP exception translation.
- The adapter preserves batch product loading and does not introduce per-item product queries.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; order creation still owns customer lookup, daily counter allocation, delivery fee lookup, coupon validation, loyalty redemption, and persistence inside `OrdersService`.
- The HTTP verification intentionally mutated only the local database by creating local order `#7` and by exercising the legacy invalid-extra path, which still allocates the daily counter and auto-creates the customer before rejecting the item.
- Next recommended slice is to introduce customer lookup and/or daily sequence order persistence ports, then start moving `CreateOrderUseCase` away from the legacy `OrdersService` bridge.

### 2026-05-07 - Phase 6 - Daily order sequence port slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/ports/order-sequence.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/mikro-orm-order-sequence.repository.ts`.
- Updated `OrdersService.create` so daily order-number allocation uses `OrderSequenceRepository` instead of inline raw SQL.
- Updated `OrdersModule` to wire `ORDER_SEQUENCE_REPOSITORY` to `MikroOrmOrderSequenceRepository`.
- Preserved the existing atomic `daily_order_counter` UPSERT SQL, including `CURRENT_DATE`, `ON CONFLICT`, increment behavior, and `RETURNING counter` fallback.
- Kept customer lookup, product lookup, category availability checks, item snapshot rules, order persistence, coupon validation, delivery fee lookup, loyalty redemption writes, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the order sequence port, sequence adapter, `orders.service.ts`, and `orders.module.ts`.
- `rg -n "import type" apps/api/src/modules/orders/orders.module.ts`
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/orders` with a valid scheduled compound product returned `201` and created local order `#9` with a numeric `orderNumber`.
- Fresh API logs showed the same `INSERT INTO daily_order_counter ... ON CONFLICT ... RETURNING counter` query before order persistence.

Self-review:
- `OrderSequenceRepository` has no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- The MikroORM adapter is the only new file in this slice that imports MikroORM and owns the concrete daily-counter SQL.
- `OrdersService` now receives daily sequence allocation through constructor parameter-property dependency injection and no longer embeds the counter SQL.
- The slice does not change transaction placement yet; it preserves the previous behavior where the sequence allocation happens before order persistence.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; order creation still owns customer lookup, delivery fee lookup, coupon validation, loyalty redemption, and order persistence inside `OrdersService`.
- The HTTP verification intentionally mutated only the local database by creating local order `#9`.
- Moving customer lookup before order persistence remains coupled to MikroORM `Customer` entities until an order persistence port or aggregate creation slice owns customer references cleanly.
- Next recommended slice is to introduce an order creation persistence port for creating the order and items, keeping delivery/coupon/loyalty still in the legacy service until the create use case can own the transaction.

### 2026-05-07 - Phase 6 - Order delivery fee port slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/domain/order-delivery-fee.policy.ts`.
- Added `apps/api/src/contexts/orders/application/ports/order-delivery-area.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/mikro-orm-order-delivery-area.repository.ts`.
- Added `apps/api/test/contexts/orders/order-delivery-fee.policy.test.ts`.
- Updated `OrdersService.create` so delivery-area requirements, missing-area rejection, and delivery-fee application go through `OrderDeliveryFeePolicy` and `OrderDeliveryAreaRepository` instead of direct `em.findOne(DeliveryArea, ...)`.
- Updated `OrdersModule` to wire `ORDER_DELIVERY_AREA_REPOSITORY` to `MikroOrmOrderDeliveryAreaRepository`.
- Removed direct `DeliveryArea` entity usage from `OrdersService`; the entity is now confined to the persistence adapter for this order creation path.
- Preserved the existing delivery error messages: `Área de entrega é obrigatória para delivery`, `Área de entrega não encontrada ou indisponível`, and the existing server-calculated delivery total behavior.
- Kept customer lookup, product lookup, category availability checks, item snapshot rules, daily sequence allocation, order persistence, coupon validation, loyalty redemption writes, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the delivery-fee policy, delivery-area port, delivery-area adapter, `orders.service.ts`, `orders.module.ts`, and the new policy test.
- `rg -n "import type" apps/api/src/modules/orders/orders.module.ts`
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/orders` with a valid scheduled delivery order returned `201`, created local order `#12`, and returned `deliveryFee=18` and `totalAmount=25`.
- Local route check for `POST /api/orders` with an unknown active delivery area id returned `400` with `Área de entrega não encontrada ou indisponível`.

Self-review:
- `OrderDeliveryFeePolicy` has no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, PagBank, or cross-context domain imports.
- `OrderDeliveryAreaRepository` has no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- The MikroORM adapter is the only new file in this slice that imports MikroORM/entities, keeping active delivery-area lookup outside domain/application.
- The first self-review found a behavior risk where an active zero-fee delivery area would not record `order.deliveryFee`; `OrdersService.create` now applies the delivery fee whenever the policy returns a fee amount, including zero.
- After that fix, unit tests, API/web typechecks, dependency scans, strictness scans, fresh API boot, smoke, and targeted delivery order checks were rerun.
- A watch-mode restart hit `EADDRINUSE`; the server was reset with `killport 3334`, booted fresh, and smoke/route checks were rerun successfully.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; order creation still owns customer lookup, coupon validation, loyalty redemption, and order persistence inside `OrdersService`.
- The HTTP verification intentionally mutated only the local database by creating local delivery order `#12`; an earlier pre-fix route check also created local delivery order `#10`.
- Invalid delivery-area route checks still allocate a daily sequence and auto-create a customer before rejection because that is the current legacy order creation order.
- Next recommended slice is to introduce an order customer lookup port that returns an order-specific customer model, while keeping actual order persistence in the legacy service until a larger create-use-case transaction slice can own the aggregate and references cleanly.

### 2026-05-07 - Phase 6 - Order customer lookup port slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/ports/order-customer.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/mikro-orm-order-customer.repository.ts`.
- Updated `OrdersService.create` so customer token lookup, phone normalization, and find-or-create customer behavior go through `OrderCustomerRepository` instead of direct `em.findOne(Customer, ...)` or `CustomersService.findOrCreateByPhone(...)`.
- Updated `OrdersService.create` to keep order persistence in the legacy service by using a local `Customer` reference from the returned order customer model.
- Updated loyalty redemption transaction and coupon usage creation to use the same local customer reference.
- Updated `OrdersModule` to wire `ORDER_CUSTOMER_REPOSITORY` to `MikroOrmOrderCustomerRepository` and removed the no-longer-needed `CustomersModule` import from `OrdersModule`.
- Preserved existing customer lookup behavior: valid active token wins; missing/invalid token falls back to normalized phone lookup and auto-creation.
- Kept product lookup, category availability checks, item snapshot rules, daily sequence allocation, delivery fee lookup, order persistence, coupon validation, loyalty redemption debit SQL, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the order-customer port, order-customer adapter, `orders.service.ts`, and `orders.module.ts`.
- `rg -n "CustomersService|CustomersModule|findOrCreateByPhone|findOne\\(Customer" apps/api/src/modules/orders/orders.service.ts apps/api/src/modules/orders/orders.module.ts apps/api/src/contexts/orders -g '*.ts'`
- `rg -n "import type" apps/api/src/modules/orders/orders.module.ts`
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/orders` without a customer token returned `201`, created local order `#14`, and returned a `customerToken`.
- Local route check for `POST /api/orders` with the returned `x-customer-token` and a different phone returned `201`, created local order `#15`, and reused the same `customerToken`.
- Checked the local database for active redeemable products before attempting a redemption route check; none were available in the fixture data.

Self-review:
- `OrderCustomerRepository` has no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- The MikroORM adapter is the only new file in this slice that imports MikroORM/entities; customer lookup and auto-creation persistence moved out of `OrdersService`.
- `OrdersService` no longer imports or injects `CustomersService` and no longer queries `Customer` directly for token lookup.
- The service still imports `Customer` only to create local references for the remaining legacy order, coupon usage, and loyalty transaction persistence paths.
- Customer phone normalization and auto-created customer logging remain in the adapter; the log message text is preserved, with the adapter logger context reflecting the new ownership.
- Self-review found that the loyalty redemption path now uses an ORM customer reference instead of a loaded customer entity; the local database had no active redeemable products, so an HTTP redemption check could not be run without inventing fixture data.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; order creation still owns coupon validation, loyalty redemption debit SQL, and order persistence inside `OrdersService`.
- The HTTP verification intentionally mutated only the local database by creating local pickup orders `#14` and `#15`.
- Loyalty redemption with a local customer reference is covered by typecheck and unchanged SQL shape, but not by a route check because local fixture data has no active redeemable products.
- Next recommended slice is to introduce an order coupon validation/application port or a small order creation persistence model, choosing the smaller path after inspecting coupon coupling and order entity references.

### 2026-05-07 - Phase 6 - Order totals value object slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/domain/order-totals.value-object.ts`.
- Added `apps/api/test/contexts/orders/order-totals.value-object.test.ts`.
- Updated `OrdersService.create` so item subtotals, delivery fees, coupon discounts, discount accumulation, zero-floor clamping, and final decimal formatting go through `OrderTotals` instead of a mutable `calculatedTotal` number.
- Preserved the existing server-calculated total behavior for paid items, zero-value loyalty redemption items, delivery fees, coupons, and totals clamped at `0.00`.
- Kept coupon validation, loyalty redemption debit SQL, order persistence, customer lookup, product lookup, delivery fee lookup, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the order totals value object, its test, and `orders.service.ts`.
- `rg -n "calculatedTotal|totalAmount = \("` against the touched order totals files and `orders.service.ts`.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local discounted order route check for `POST /api/orders` with coupon `CODEX015708` returned `201`, created local order `#16`, and returned product price `7`, discount `2`, and total `5`.

Self-review:
- `OrderTotals` has no Nest, MikroORM, entity, DTO, controller, adapter, queue, socket, filesystem, PagBank, or cross-context domain imports.
- `OrderTotals` is an immutable value object with explicit member accessibility, explicit return types, no `any`, and no non-null assertions.
- The value object owns total arithmetic and discount clamping while `OrdersService` remains the temporary orchestration bridge for persistence and HTTP exception translation.
- The unit tests cover item subtotal accumulation, delivery fee accumulation, discount clamping to zero, immutability, and invalid cent amounts.
- The first smoke command after the HTTP discount check was mistyped as `pnm smoke:api`; the correct `pnpm smoke:api` was rerun after a fresh `killport 3334` API boot and passed.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; order creation still owns coupon validation, loyalty redemption debit SQL, and order persistence inside `OrdersService`.
- The HTTP verification intentionally mutated only the local database by inserting local test coupon `CODEX015708` and creating local discounted order `#16`.
- `OrderTotals` is still consumed from the legacy service path; the next larger create-order slice should move total calculation behind the real `CreateOrderUseCase` transaction boundary.
- Next recommended slice is to inspect coupon coupling and introduce the smallest order coupon validation/application port, unless the inspection shows order persistence extraction is safer first.

### 2026-05-07 - Phase 6 - Order coupon validation port slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/ports/order-coupon.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/legacy-coupons-service-order-coupon.validator.ts`.
- Added `apps/api/test/contexts/orders/legacy-coupons-service-order-coupon.validator.test.ts`.
- Updated `OrdersService.create` so coupon validation and discount application go through `OrderCouponValidator` instead of directly importing and injecting `CouponsService`.
- Updated `OrdersModule` to wire `ORDER_COUPON_VALIDATOR` to a clearly named temporary legacy adapter backed by the existing `CouponsService`.
- Preserved existing coupon validation behavior, coupon id/code application, discount cents used for totals, and persisted `discountAmount` formatting from `calculatedDiscount.toFixed(2)`.
- Kept coupon usage persistence, loyalty redemption debit SQL, order persistence, customer lookup, product lookup, delivery fee lookup, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the order coupon port, legacy coupon adapter, adapter test, `orders.service.ts`, and `orders.module.ts`.
- `rg -n "CouponsService|validateAndCalculate|couponResult" apps/api/src/modules/orders/orders.service.ts apps/api/src/modules/orders/orders.module.ts apps/api/src/contexts/orders apps/api/test/contexts/orders`
- Cleaned stale local API watch processes left from earlier restarts, then ran `zsh -ic 'killport 3334'` before a fresh API boot through `pnpm --filter api dev`.
- `pnpm smoke:api`
- Local discounted order route check for `POST /api/orders` with coupon `CODEX015708` returned `201`, created local order `#19`, and returned product price `17`, discount `2`, and total `15`.
- Local database check for orders `#18` and `#19` confirmed persisted `discount_amount=2.00`, `total_amount=15.00`, and `coupon_code=CODEX015708`.

Self-review:
- `OrderCouponValidator` and its port models have no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- The temporary legacy adapter is explicitly named as a legacy `CouponsService` bridge and keeps the current coupon rules in one place instead of duplicating them in orders.
- `OrdersService` no longer imports or injects `CouponsService`; only `OrdersModule` depends on `CouponsService` as composition-root wiring for the temporary adapter.
- The first self-review found a formatting fidelity risk where using `discountCents` to format `order.discountAmount` might differ from the legacy `calculatedDiscount.toFixed(2)` path; the adapter now returns both `discountCents` and the legacy-formatted `discountAmount`.
- The first post-fix HTTP assertion expected the API response to expose `discountAmount` as a string, but `formatOrder` intentionally returns it as a number; order `#18` was created successfully, the assertion was corrected to match the public route contract, and the check passed with order `#19`.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; order creation still owns coupon usage persistence, loyalty redemption debit SQL, and order persistence inside `OrdersService`.
- The HTTP verification intentionally mutated only the local database by creating local discounted orders `#17`, `#18`, and `#19` and incrementing local coupon `CODEX015708` usage.
- Coupon validation still runs through the legacy coupons service behind the port; a later coupon context slice should replace the temporary adapter with a proper order coupon repository/use-case boundary.
- Next recommended slice is to introduce a narrow order loyalty redemption port or start an order creation persistence model, choosing the smaller path after inspecting the remaining `OrdersService.create` entity references and transaction placement.

### 2026-05-07 - Phase 6 - Order coupon usage port slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/ports/order-coupon-usage.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/mikro-orm-order-coupon-usage.repository.ts`.
- Added `apps/api/test/contexts/orders/mikro-orm-order-coupon-usage.repository.test.ts`.
- Updated `OrdersService.create` so coupon usage incrementing and `CouponUsage` persistence go through `OrderCouponUsageRepository` instead of inline raw SQL and direct entity creation.
- Updated `OrdersModule` to wire `ORDER_COUPON_USAGE_REPOSITORY` to `MikroOrmOrderCouponUsageRepository`.
- Removed the direct `CouponUsage` entity import from `OrdersService`.
- Preserved the existing post-order-flush coupon usage behavior and SQL shape.
- Kept coupon validation, loyalty redemption debit SQL, order persistence, customer lookup, product lookup, delivery fee lookup, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the order coupon usage port, adapter, adapter test, `orders.service.ts`, and `orders.module.ts`.
- `rg -n "CouponUsage|current_uses|recordUsage|ORDER_COUPON_USAGE" apps/api/src/modules/orders/orders.service.ts apps/api/src/modules/orders/orders.module.ts apps/api/src/contexts/orders apps/api/test/contexts/orders`
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local discounted order route check for `POST /api/orders` with coupon `CODEX015708` returned `201`, created local order `#20`, and returned product price `17`, discount `2`, and total `15`.
- Local database check confirmed `CODEX015708.current_uses=5`, exactly one `coupon_usages` row for order `#20`, and persisted `discount_amount=2.00` / `total_amount=15.00`.

Self-review:
- `OrderCouponUsageRepository` and its command model have no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- The MikroORM adapter is the only new file in this slice that imports MikroORM/entities and owns the concrete coupon usage persistence.
- `OrdersService` no longer imports `CouponUsage`, no longer runs the coupon usage `UPDATE` directly, and no longer creates `CouponUsage` entities directly.
- The adapter preserves the legacy SQL text and post-flush timing; it does not introduce a nested transaction because the larger create-order unit-of-work boundary is still pending.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; order creation still owns loyalty redemption debit SQL and order/item persistence inside `OrdersService`.
- The HTTP verification intentionally mutated only the local database by creating local discounted order `#20` and incrementing local coupon `CODEX015708` usage.
- Coupon usage persistence now runs behind a port but still happens after the order flush, preserving the legacy behavior rather than solving the larger transaction boundary.
- Next recommended slice is to inspect and introduce a narrow order loyalty redemption port, unless the missing local redeemable product fixture makes a smaller order persistence preparation slice safer.

### 2026-05-07 - Phase 6 - Order loyalty redemption port slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/ports/order-loyalty-redemption.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/mikro-orm-order-loyalty-redemption.repository.ts`.
- Added `apps/api/test/contexts/orders/mikro-orm-order-loyalty-redemption.repository.test.ts`.
- Updated `OrdersService.create` so loyalty points debiting and post-flush redemption transaction persistence go through `OrderLoyaltyRedemptionRepository` instead of inline raw SQL and direct `LoyaltyTransaction` creation.
- Updated `OrdersModule` to wire `ORDER_LOYALTY_REDEMPTION_REPOSITORY` to `MikroOrmOrderLoyaltyRedemptionRepository`.
- Preserved the existing atomic customer-points debit SQL, insufficient-points message, post-order-flush redemption transaction timing, negative transaction points, and `Resgate — Pedido #...` description.
- Kept redemption eligibility checks, product lookup, order/item persistence, coupon validation/usage, delivery fee lookup, customer lookup, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the order loyalty redemption port, adapter, adapter test, `orders.service.ts`, and `orders.module.ts`.
- `rg -n "LoyaltyTransaction|loyalty_points|ORDER_LOYALTY_REDEMPTION|orderLoyaltyRedemptionRepository|recordRedemption|debitPoints" apps/api/src/modules/orders/orders.service.ts apps/api/src/modules/orders/orders.module.ts apps/api/src/contexts/orders apps/api/test/contexts/orders`
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local redemption order route check for `POST /api/orders` returned `201`, created local order `#21`, returned total `17`, reused the provided customer token, and returned two items: one paid item and one zero-value redeemed item.
- Local database check for order `#21` confirmed `points_spent=1`, `total_amount=17.00`, the local customer balance decreased from `5` to `4`, exactly one redeemed order item was persisted, and exactly one `redeem` loyalty transaction with `points=-1` was persisted.
- The route check temporarily set local product `146badde-dd74-4044-9089-02675a3f481a` to `is_redeemable=true` and `redemption_cost=1`; the product was restored afterward to `is_redeemable=false` and `redemption_cost=0`.

Self-review:
- `OrderLoyaltyRedemptionRepository` and its command/result models have no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- The MikroORM adapter is the only new file in this slice that imports MikroORM/entities and owns the concrete points debit SQL plus redemption transaction persistence.
- `OrdersService.create` no longer runs the loyalty debit `UPDATE` directly and no longer creates the redemption `LoyaltyTransaction` directly.
- The adapter preserves the legacy SQL text and post-flush timing; it does not introduce a nested transaction because the larger create-order unit-of-work boundary is still pending.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; order creation still owns order/order-item persistence and ORM entity references inside `OrdersService`.
- The HTTP verification intentionally mutated only the local database by creating local customer `c2aa11ad-07f5-4918-a991-2fe05fbb435c`, local order `#21`, one redeemed order item, and one loyalty redemption transaction.
- The local product redeemability fixture was restored after verification, but the local order/customer/transaction rows remain.
- Next recommended slice is to introduce a narrow order creation persistence model/port so `OrdersService.create` can stop creating `Order` and `OrderItem` entities directly before moving the full create flow into `CreateOrderUseCase`.

### 2026-05-07 - Phase 6 - Order creation persistence port slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/ports/order-creation.repository.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/persistence/mikro-orm-order-creation.repository.ts`.
- Added `apps/api/test/contexts/orders/mikro-orm-order-creation.repository.test.ts`.
- Updated `OrdersService.create` so `Order` and `OrderItem` entity construction plus the order flush go through `OrderCreationRepository` instead of inline `em.create(Order)`, `em.create(OrderItem)`, and `em.flush()`.
- Updated `OrdersModule` to wire `ORDER_CREATION_REPOSITORY` to `MikroOrmOrderCreationRepository`.
- Preserved order creation response mapping by returning the existing `OrderReadModel` shape from the persistence adapter and adding `customerToken` in the legacy service response.
- Preserved coupon id/code/discount persistence, delivery fee/address persistence, redeemed item persistence, order `pointsSpent`, item snapshot data, scheduled time, status, payment method, and post-flush coupon/loyalty side-effect timing.
- Kept validation rules, product lookup, customer lookup, sequence allocation, coupon validation/usage, loyalty debit/transaction, delivery fee lookup, controllers, DTOs, routes, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the order creation port, adapter, adapter test, `orders.service.ts`, and `orders.module.ts`.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local coupon plus redemption route check for `POST /api/orders` returned `201`, created local order `#22`, returned total `15`, discount `2`, coupon `CODEX015708`, reused the provided customer token, and returned one paid item plus one zero-value redeemed item.
- Local delivery route check for `POST /api/orders` returned `201`, created local order `#23`, returned delivery fee `27`, total `44`, and persisted the delivery address.
- Local database check for order `#22` confirmed `points_spent=1`, `total_amount=15.00`, `discount_amount=2.00`, coupon code `CODEX015708`, customer balance decreased from `5` to `4`, exactly one redeemed order item, exactly one redemption transaction, and exactly one coupon usage row.
- Local database check for order `#23` confirmed `delivery_fee=27.00`, `total_amount=44.00`, `delivery_type=delivery`, the expected delivery address JSON, and one paid item.
- Local coupon `CODEX015708.current_uses` is now `6` after the route check.
- The route check temporarily set local product `146badde-dd74-4044-9089-02675a3f481a` to `is_redeemable=true` and `redemption_cost=1`; the product was restored afterward to `is_redeemable=false` and `redemption_cost=0`.

Self-review:
- `OrderCreationRepository` and its command/result models have no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- The MikroORM adapter is the only new file in this slice that imports MikroORM/entities and owns concrete `Order`/`OrderItem` creation.
- `OrdersService.create` no longer creates `Order` or `OrderItem` entities directly and no longer flushes the order directly.
- The first self-review removed an unnecessary private pass-through method, tightened the port `deliveryType` from `string` to `'pickup' | 'delivery'`, removed an unused adapter type import, and expanded adapter unit coverage to assert persisted order/item payloads. Verification was rerun after those fixes.
- The adapter preserves the legacy order flush timing; it does not yet introduce a full create-order unit-of-work around sequence/customer/product/coupon/loyalty operations.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; `OrdersService.create` still orchestrates the full create flow and still owns validation order, total assembly, coupon validation timing, loyalty debit timing, and side-effect sequencing.
- Order creation still does not use a single explicit unit-of-work across customer lookup, sequence allocation, loyalty debit, order persistence, coupon usage, and redemption transaction; this slice preserves legacy timing while moving entity creation behind a port.
- The HTTP verification intentionally mutated only the local database by creating local customer `6422f2e8-ffb4-41b7-9dcb-75c4e795455d`, local orders `#22` and `#23`, one redemption transaction, one coupon usage row, and one delivery-order customer.
- The local product redeemability fixture was restored after verification, but the local order/customer/transaction/coupon-usage rows remain.
- Next recommended slice is to start moving `CreateOrderUseCase` away from the legacy service bridge by introducing a narrow application command/use-case orchestration layer around the already extracted ports, or first extract the remaining store/category availability check behind an orders port if the create-use-case write scope becomes too wide.

### 2026-05-07 - Phase 6 - Order availability port/policy slice

Status: Done

Changed:
- Added `apps/api/src/contexts/orders/application/ports/order-store-availability.port.ts`.
- Added `apps/api/src/contexts/orders/adapters/store/legacy-store-service-order-store-availability.checker.ts`.
- Added `apps/api/src/contexts/orders/domain/order-product-availability.policy.ts`.
- Added `apps/api/test/contexts/orders/legacy-store-service-order-store-availability.checker.test.ts`.
- Added `apps/api/test/contexts/orders/order-product-availability.policy.test.ts`.
- Updated `OrdersService.create` availability checks so store-open validation goes through `OrderStoreAvailabilityChecker` and product/category availability goes through `OrderProductAvailabilityPolicy`.
- Updated `OrdersModule` to wire `ORDER_STORE_AVAILABILITY_CHECKER` to a clearly named temporary legacy adapter backed by the existing `StoreService`.
- Preserved immediate versus scheduled store-open behavior, including `ignoreForceOpen: true` for scheduled orders, and preserved the existing product availability error message shape.
- Kept order orchestration, product lookup, customer lookup, sequence allocation, total assembly, coupon validation/usage, loyalty debit/transaction, order persistence, controllers, DTOs, routes, Swagger setup, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the order availability port, policy, legacy store adapter, adapter tests, `orders.service.ts`, and `orders.module.ts`.
- `rg -n "StoreService|storeService|getCombinedScheduleAvailability|normalizeWeeklySchedule" apps/api/src/modules/orders/orders.service.ts`
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local scheduled pickup route check for `POST /api/orders` at `2026-05-08T12:00:00-03:00` with product `146badde-dd74-4044-9089-02675a3f481a` returned `201`, created local order `#24`, and returned one item.
- Local scheduled pickup route check for `POST /api/orders` at `2026-05-08T12:00:00-03:00` with dinner product `0c7ae3e0-5a4c-46bf-ba4b-bbccf74eb313` returned `400` with message `Quentinha P — Jantar: Disponível hoje às 18:00`.

Self-review:
- `OrderStoreAvailabilityChecker` and its query/result models have no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or PagBank imports.
- `OrderProductAvailabilityPolicy` keeps product/category availability decision-making behind an orders domain policy, following the existing menu/store schedule policy pattern for shared schedule normalization/evaluation.
- The temporary legacy adapter is explicitly named as a legacy `StoreService` bridge and is the only new orders-context file that depends on the current store module service.
- `OrdersService.create` no longer imports or injects `StoreService`, `getCombinedScheduleAvailability`, or `normalizeWeeklySchedule`.
- The first unit run found the adapter test double allowed `reason: null`, while the legacy `StoreService.isOpen` surface only allows `reason?: string`; the fake was narrowed and verification was rerun.
- The first self-review found missing explicit return types on the touched private legacy service methods; `assertStoreCanAcceptOrder` now returns `Promise<void>` and `assertProductAvailableAt` returns `void`, then verification was rerun.
- The first route probe used a non-UUID customer token and hit the existing UUID database constraint before the availability path; the check was rerun with a UUID token and passed.
- Controllers, DTOs, routes, and Swagger setup were not touched.

Risks:
- Phase 6 is not complete; `OrdersService.create` still orchestrates the full create flow and still owns validation order, total assembly, coupon validation timing, loyalty debit timing, and side-effect sequencing.
- Store availability still runs through the legacy `StoreService` behind a port; a later store/orders boundary slice should replace this bridge with a narrower store availability application adapter or shared policy command.
- Product/category availability now has an orders domain policy but still relies on the existing shared schedule evaluator to preserve current labels and timezone behavior.
- The HTTP verification intentionally mutated only the local database by creating local order `#24` and local customers for the route probes.
- Next recommended slice is to start moving `CreateOrderUseCase` away from the legacy service bridge by introducing a narrow application command/use-case orchestration layer around the already extracted ports.

### 2026-05-07 - Phase 6 - Order creation transaction context preparation slice

Status: Done

Changed:
- Added optional `TransactionContext` support to order creation write ports used by the create flow: sequence, customer, product catalog, delivery area, order persistence, coupon usage, and loyalty redemption.
- Updated the matching MikroORM adapters so a future `CreateOrderUseCase` transaction can pass the unit-of-work entity manager through those ports instead of forcing independent root/forked entity managers.
- Preserved current behavior for existing callers that do not pass a context: customer/product/delivery/sequence adapters still use their existing entity manager behavior, while order creation, coupon usage, and loyalty redemption adapters still fork when no context is provided.
- Added focused adapter unit coverage proving order creation, coupon usage, and loyalty redemption use the provided transaction context and do not fork separate entity managers when a context is supplied.
- Kept `OrdersService.create` orchestration, controller wiring, DTOs, routes, Swagger setup, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- `rg -n "from ['\"]@nestjs|from ['\"]@mikro-orm|EntityManager|@Entity|Collection" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "from ['\"].*/adapters|from ['\"].*/controllers|from ['\"].*/dto" apps/api/src/contexts/**/domain apps/api/src/contexts/**/application apps/api/src/shared/application`
- `rg -n "\bas any\b|: any|as any|!\."` against the touched order creation ports, adapters, and adapter tests.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local scheduled pickup route check for `POST /api/orders` at `2026-05-08T12:00:00-03:00` with product `146badde-dd74-4044-9089-02675a3f481a` returned `201`, created local order `#25`, and returned one item.

Self-review:
- The application ports now depend only on the shared application `TransactionContext`; they still do not import Nest, MikroORM, entities, controllers, DTOs, adapters, queues, sockets, filesystem, or PagBank code.
- The MikroORM adapters remain the only touched production files that import the concrete `getMikroOrmEntityManager` transaction adapter helper.
- No route contract changed and no controller/DTO/Swagger files were touched.
- The first fresh API boot hit a stale `dist` module-resolution error for `products.module`; `pnpm --filter api build` rebuilt the output cleanly, then `killport`, fresh dev boot, smoke, and the targeted order route check passed.
- The route check confirmed the existing non-context path remains unchanged for now: customer auto-create, daily sequence allocation, and order persistence still happen as separate operations until the next create-use-case transaction slice.

Risks:
- Phase 6 is not complete; `CreateOrderUseCase` still delegates to the legacy `OrdersService.create` bridge and does not yet own the create transaction.
- Coupon validation still runs through the legacy coupon service and does not yet accept a transaction context.
- Customer/product/delivery/sequence context paths are wired for the next slice but not independently unit-tested in this slice; they will be exercised when `CreateOrderUseCase` starts passing a unit-of-work context through the full create flow.
- The HTTP verification intentionally mutated only the local database by creating local order `#25` and one local customer.
- Next recommended slice is to replace the legacy `CreateOrderUseCase` bridge with an application-level create-order orchestrator that passes a unit-of-work context through the prepared ports while preserving current HTTP behavior.

### 2026-05-07 - Phase 6 - Order creation use-case orchestration slice

Status: Done

Changed:
- Replaced the temporary `CreateOrderUseCase` legacy-service bridge with an application-level create-order orchestrator that owns the unit-of-work boundary.
- Moved the `/api/orders` create path so `OrdersController` maps `CreateOrderDto` into an application command, translates application errors into HTTP exceptions, and does not pass DTOs into application code.
- Wired `CreateOrderUseCase` in `OrdersModule` with the prepared order ports, `MikroOrmUnitOfWork`, a system clock, and a new order creation reporter port.
- Removed the legacy `OrdersService.create` path and its create-only dependencies; `OrdersService` now keeps the remaining legacy read/status/payment-support behavior.
- Added `OrderCreationReporter` and a Nest logging adapter so order-created reporting happens after the use-case transaction commits.
- Added focused fake-port tests for successful create ordering, transaction context propagation, coupon usage, loyalty debit/redemption recording, post-commit reporting, store-closed rollback, and missing-product rollback.
- Removed the obsolete create-order legacy bridge test.
- Kept DTO schemas, Swagger setup/decorators, payment gateway calls, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit` - 119 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- `rg -n "from ['\"][^'\"]*(modules|dto|entities|@nestjs|@mikro-orm|pagbank|websocket)" apps/api/src/contexts/orders/application apps/api/src/contexts/orders/domain` returned no matches.
- `rg -n "import type|@Api" apps/api/src/modules/orders/orders.controller.ts apps/api/src/modules/orders/dto apps/api/src/modules/orders/orders.module.ts` returned no matches.
- `rg -n "\bany\b|[A-Za-z0-9_\)\]]!"` against the touched create-order use case, reporter port/adapter, controller/module/service, and new use-case test returned no matches.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local scheduled pickup route check for `POST /api/orders` at `2026-05-08T12:00:00-03:00` with product `146badde-dd74-4044-9089-02675a3f481a` returned `201`, created local order `#26`, and returned one item.

Self-review:
- `CreateOrderUseCase` no longer imports Nest, controllers, DTOs, entities, MikroORM, adapters, sockets, queues, filesystem, PagBank clients, or HTTP response objects.
- The controller touched in this slice follows the Swagger guide constraints for the current project state: regular imports only, no manual `@Api*` decorators, and no DTO/schema changes.
- The route log confirmed `begin`, customer auto-create, product lookup, daily sequence allocation, order/order-item inserts, `commit`, then `NestOrderCreationReporter` logging after commit.
- Constructor dependency injection uses TypeScript parameter properties, and touched files avoid `any` and non-null assertions.
- The first self-review found formatting drift in `order-use-case-bridge.test.ts` and a non-ASCII dash in the new reporter log; both were fixed and checks were rerun.

Risks:
- Phase 6 is not complete; order creation now owns the transaction boundary, but the create use case is still a larger orchestrator and should be thinned in a follow-up rich-domain slice rather than allowed to grow.
- Coupon validation still runs through the legacy coupon service and does not yet accept a transaction context.
- Store availability still runs through the legacy store service behind an orders port.
- The HTTP verification intentionally mutated only the local database by creating local order `#26` and local customer phone `81988770026`.
- Next recommended slice is to keep Phase 6 focused on rich write-model cleanup: extract an order creation domain object/factory or policy boundary that owns item/totals/redemption assembly so `CreateOrderUseCase` stays orchestration-only.

### 2026-05-07 - Phase 6 - Order creation draft value object slice

Status: Done

Changed:
- Added `OrderCreationDraft`, an immutable orders domain value object for order-create item draft assembly, total calculation, delivery-fee application, coupon discount application, redeemed item draft creation, and points-spent calculation.
- Added focused unit tests for paid item plus delivery/coupon/redemption totals, defensive item-copy behavior, pickup delivery fee no-op behavior, and invalid redeemed item draft values.
- Updated `CreateOrderUseCase` so it orchestrates port calls and passes snapshots/redemption inputs into `OrderCreationDraft` instead of mutating `OrderTotals` and persistence item arrays directly.
- Removed create-use-case helper methods that only converted order item extras/grouped extras after draft assembly.
- Kept controllers, DTOs, Swagger setup, modules, services, adapters, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted order tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/orders/order-creation-draft.value-object.test.ts test/contexts/orders/create-order.use-case.test.ts`
- `pnpm --filter api test:unit` - 122 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- `rg -n "from ['\"]( @nestjs|@nestjs|@mikro-orm)|EntityManager|@Entity|Collection|from ['\"][^'\"]*(modules|dto|entities|adapters|controllers|pagbank|websocket)" apps/api/src/contexts/orders/domain apps/api/src/contexts/orders/application` returned no matches.
- `rg -n "\bany\b|[A-Za-z0-9_\)\]]!" apps/api/src/contexts/orders/domain/order-creation-draft.value-object.ts apps/api/test/contexts/orders/order-creation-draft.value-object.test.ts apps/api/src/contexts/orders/application/use-cases/create-order.use-case.ts` returned no matches.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local scheduled pickup route check for `POST /api/orders` at `2026-05-08T12:00:00-03:00` with product `146badde-dd74-4044-9089-02675a3f481a` returned `201`, created local order `#27`, and returned one item.

Self-review:
- `OrderCreationDraft` imports only orders domain types/value objects and does not import Nest, MikroORM, entities, controllers, DTOs, adapters, queues, sockets, filesystem, PagBank code, or application ports.
- `CreateOrderUseCase` is smaller and now delegates item/totals/redemption draft state to a rich domain value object, but still owns loading, validation sequencing, transaction boundaries, persistence calls, and post-commit reporting.
- The route log confirmed `begin`, customer auto-create, product lookup, daily sequence allocation, order/order-item inserts, `commit`, then `NestOrderCreationReporter` logging after commit.
- No controller or DTO file was touched in this slice, so no Swagger metadata surface changed.
- No code fixes were needed after self-review; verification had already passed against the intended scope.

Risks:
- Phase 6 is not complete; order creation still uses several policies/value objects rather than a full `Order` aggregate that owns lifecycle and payment state.
- `CreateOrderUseCase` still imports `ProductPricePolicy` from the menu context to preserve current pricing behavior; a later boundary cleanup can replace this cross-context domain dependency with an order-facing product price/read model value.
- Coupon validation still runs through the legacy coupon service and does not yet accept a transaction context.
- The HTTP verification intentionally mutated only the local database by creating local order `#27` and local customer phone `81988770027`.
- Next recommended slice is to inspect `OrdersService` remaining callers and remove or move dead legacy order read/status methods now that order create/status/read controller paths use order application use cases.

### 2026-05-07 - Phase 6 - Orders service dead method cleanup slice

Status: Done

Changed:
- Inspected remaining `OrdersService` callers and confirmed payment code uses only `findById`.
- Removed dead legacy `OrdersService.getOrderResponse`, `getKitchenOrders`, `updateStatus`, `formatOrder`, and `requireDate` methods now that order controller create/read/status paths use order application use cases and read/status adapters.
- Removed the matching dead imports and dependencies from `OrdersService`, including `BadRequestException`, `Logger`, `OrderStatus`, `KitchenGateway`, `OrderStatusTransitionPolicy`, `LoyaltyPointsPolicy`, `LoyaltyTransaction`, and `StoreSettings`.
- Kept `OrdersService.findById` as a narrow payment-facing compatibility facade with an explicit `Promise<Order>` return type.
- Kept controllers, DTOs, Swagger setup, modules, adapters, use cases, payments behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- `pnpm --filter api test:unit` - 122 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- `rg -n "getOrderResponse\(|async getKitchenOrders\(|async updateStatus\(|formatOrder\(|requireDate\(|OrderStatusTransitionPolicy|LoyaltyPointsPolicy|KitchenGateway|BadRequestException|Logger" apps/api/src/modules/orders/orders.service.ts` returned no matches.
- `rg -n "\bany\b|[A-Za-z0-9_\)\]]!" apps/api/src/modules/orders/orders.service.ts` returned no matches.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The removed service methods were not referenced by production code; controller-facing kitchen/detail/status behavior now goes through `GetKitchenOrdersUseCase`, `GetOrderDetailsUseCase`, and `ChangeOrderStatusUseCase`.
- `OrdersService` is now explicitly a narrow Nest/MikroORM compatibility facade for payment flows that still need an ORM `Order` entity.
- No route contract changed and no controller/DTO/Swagger file was touched.
- The fresh API boot and smoke check verified Nest DI after removing the obsolete `KitchenGateway` constructor dependency.

Risks:
- Phase 6 is not complete; payment services still depend on `OrdersService.findById` and mutate/read ORM orders directly.
- `OrdersModule` still exports `OrdersService` because payment flows use it; removing that facade belongs with the payment context.
- Next recommended slice is Phase 7 payment context preparation: introduce a payment-facing order lookup/update port or payment gateway port in the smallest safe slice so payment services stop depending directly on `OrdersService`.

### 2026-05-07 - Phase 7 - Payment order port slice

Status: Done

Changed:
- Added `PaymentOrderRepository` and `PaymentRealtimeNotifier` application ports for payment-owned order lookup, payment status mutation, and paid-order realtime notification.
- Added `MikroOrmPaymentOrderRepository` to map `Order` entities into payment order models and apply Pix pending plus gateway status updates without leaking ORM entities into payment application ports.
- Added `SocketIoPaymentRealtimeNotifier` so payment code emits the same paid-order WebSocket event shape through a port instead of calling `KitchenGateway` directly.
- Updated `PaymentsService` to inject payment ports through Nest tokens, remove direct `OrdersService`, `EntityManager`, `Order`, and `KitchenGateway` dependencies, and keep PagBank request/evidence behavior unchanged.
- Updated `PaymentsModule` to wire the new payment order and realtime adapters and remove the `OrdersModule` import.
- Added focused unit tests for payment order mapping/status mutation and paid-order realtime emission.
- Kept controllers, DTOs, Swagger setup, route contracts, payment gateway behavior, webhook processor behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted payment tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/mikro-orm-payment-order.repository.test.ts test/contexts/payments/socket-io-payment-realtime.notifier.test.ts test/contexts/payments/payment-use-case-bridge.test.ts`
- `pnpm --filter api test:unit` - 128 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Scoped payment application dependency scan for the new ports returned no Nest, MikroORM, entity, controller, DTO, adapter, PagBank, or websocket imports.
- Scoped strictness scan over the touched payment files returned no `any` or non-null assertions.
- `rg` confirmed `PaymentsService` and `PaymentsModule` no longer import or reference `OrdersService` or `OrdersModule`.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `GET /api/payments/b6fb9654-7937-428b-8a3b-6ea68e168459/status` returned `200` with `orderStatus=pending_payment` and `paymentStatus=null`.

Self-review:
- The new payment application ports do not import Nest, MikroORM, ORM entities, controllers, DTOs, adapters, queues, sockets, filesystem, or concrete PagBank code.
- `MikroOrmPaymentOrderRepository` is the only new payment order file that imports MikroORM/entities, keeping persistence mapping in the adapter layer.
- `PaymentsService` still owns concrete PagBank requests and evidence logging for now, but no longer reaches through the legacy orders facade to load or mutate payment orders.
- Paid-order WebSocket emission preserves the existing full admin payload plus minimal public payload shape.
- No controller, DTO, or Swagger-visible file was touched in this slice.

Risks:
- `PaymentProcessor` still mutates `Order` entities directly and duplicates payment status application; that should be the next narrow Phase 7 slice using the new payment order and realtime ports.
- Payment controller use cases still bridge to `PaymentsService`; replacing those bridges belongs after gateway and processor internals are isolated.
- `PaymentsService` still contains concrete PagBank HTTP calls and evidence logging; a later Phase 7 gateway adapter slice should move that behind `PaymentGateway`.
- The payment status route check used an existing local order and did not call the real PagBank gateway.
- Next recommended slice is to move `PaymentProcessor.applyPaymentResult` to the payment order/realtime ports so webhook queue processing stops mutating ORM orders directly.

### 2026-05-07 - Phase 7 - Payment processor order port slice

Status: Done

Changed:
- Extended `PaymentOrderRepository` with queued payment result application for webhook/queue processing.
- Moved queued payment lookup, idempotent approved skip, terminal-order skip, status mutation, and paid-order notification model creation into `MikroOrmPaymentOrderRepository`.
- Updated `PaymentProcessor` so it no longer injects `EntityManager` or `KitchenGateway`, no longer imports `Order` entities, and no longer mutates or flushes ORM orders directly.
- Kept `PaymentProcessor` responsible for queue orchestration, optional PagBank order fetches, status mapping through `PaymentsService`, logging, and post-apply realtime notification through `PaymentRealtimeNotifier`.
- Added focused unit tests for processor direct mapped jobs, gateway-fetch jobs, skipped queue results, payment-id lookup, reference-id fallback, idempotent approved skips, and terminal-order skips.
- Kept controllers, DTOs, Swagger setup, route contracts, gateway request behavior, webhook controller behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted payment tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/mikro-orm-payment-order.repository.test.ts test/contexts/payments/payment-processor.test.ts test/contexts/payments/socket-io-payment-realtime.notifier.test.ts`
- `pnpm --filter api test:unit` - 135 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Scoped payment application dependency scan for the payment ports returned no Nest, MikroORM, entity, controller, DTO, adapter, PagBank, or websocket imports.
- Scoped strictness scan over touched processor/payment port files returned no `any` or non-null assertions.
- `rg` confirmed `PaymentProcessor` no longer imports entities, `EntityManager`, or `KitchenGateway`, and no longer calls `em.findOne`, `em.flush`, or `emitNewOrder`.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- The queue processor now depends on payment ports for order mutation and realtime emission, preserving the existing process return shapes: `{ processed: true, status }` and skipped results.
- The repository preserves the legacy lookup order: payment id first, then PagBank reference id when present.
- The repository preserves the legacy webhook safeguards for approved idempotency and terminal delivered/cancelled orders.
- Paid webhook processing still emits realtime notifications only after the persistence adapter applies the status successfully.
- No controller, DTO, route, or Swagger-visible file was touched in this slice.

Risks:
- `PaymentProcessor` still calls `PaymentsService.getPagBankOrder` for unmapped queue jobs, so concrete PagBank gateway calls are still inside the legacy service.
- Payment controller use cases still bridge to `PaymentsService`; replacing those bridges belongs after the gateway port is introduced.
- `OrdersService` now appears to be legacy cleanup surface rather than payment support, but removing it should be a separate cleanup slice after a caller scan.
- This slice verified queue behavior with fake ports and boot/smoke; it did not process a real BullMQ job against the local Redis queue.
- Next recommended slice is to introduce a `PaymentGateway` port and PagBank adapter for `getPaymentStatus`/order lookup first, then expand to Pix/card/debit creation once the gateway response mapping is behind fake-port tests.

### 2026-05-07 - Phase 7 - Payment gateway status lookup port slice

Status: Done

Changed:
- Added a `PaymentGateway` application port for external payment status lookup.
- Added `LegacyPaymentsServicePaymentGateway`, a temporary PagBank adapter around the existing `PaymentsService.getPagBankOrder` and `mapPagBankOrderStatus` behavior.
- Updated `PaymentProcessor` so unmapped queue jobs use `PaymentGateway` instead of depending directly on `PaymentsService`.
- Updated `PaymentsModule` to wire `PAYMENT_GATEWAY` through the temporary legacy adapter.
- Added a focused gateway adapter test and updated processor tests to fake the gateway.
- Kept controllers, DTOs, Swagger setup, route contracts, payment creation flows, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted payment tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/legacy-payments-service-payment.gateway.test.ts test/contexts/payments/payment-processor.test.ts`
- `pnpm --filter api test:unit` - 136 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Scoped payment application dependency scan for the gateway port returned no Nest, MikroORM, entity, controller, DTO, adapter, concrete PagBank, queue, or websocket imports.
- Scoped strictness scan over touched gateway and processor files returned no `any` or non-null assertions.
- `rg` confirmed `PaymentProcessor` no longer references `PaymentsService`, `getPagBankOrder`, or `mapPagBankOrderStatus`.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`

Self-review:
- `PaymentProcessor` now depends on payment gateway, order, and realtime ports for queue processing.
- The new gateway port has no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- The temporary legacy gateway adapter is explicitly named as a bridge and keeps the current PagBank request, mapping, and evidence behavior in `PaymentsService` until the real gateway adapter slice.
- No controller, DTO, route, or Swagger-visible file was touched in this slice.
- No route contract changed.

Risks:
- `PaymentsService` still contains concrete PagBank HTTP calls for status lookup and payment creation; the next slice should replace the temporary adapter with a real `PagBankPaymentGateway` for status lookup or first extract reusable PagBank HTTP/evidence infrastructure.
- Pix, credit-card, debit-card, and 3DS creation still run through the legacy service and should move behind gateway/use cases after status lookup is isolated.
- Payment controller use cases still bridge to `PaymentsService`.
- This slice verified the gateway-status path with fake ports and boot/smoke, but did not call the real PagBank gateway.
- Next recommended slice is to replace `LegacyPaymentsServicePaymentGateway` with a real `PagBankPaymentGateway` for GET `/orders/:id`, preserving evidence logging and redaction behavior.

### 2026-05-07 - Phase 7 - Real PagBank status gateway adapter slice

Status: Done

Changed:
- Added `PagBankPaymentGateway`, a real PagBank adapter for GET `/orders/:id` payment status lookups.
- Moved queued-payment gateway status lookup off the temporary `LegacyPaymentsServicePaymentGateway` bridge and onto the real adapter wired from `ConfigService`.
- Updated `PaymentsService.getPaymentStatus` to use the `PaymentGateway` port for status synchronization instead of calling its own concrete `getPagBankOrder` method.
- Removed `PaymentsService.getPagBankOrder` and made its remaining PagBank order-status mapper private to payment creation flows.
- Deleted the temporary legacy gateway adapter and replaced its test with focused `PagBankPaymentGateway` tests using mocked `fetch`.
- Preserved PagBank evidence behavior for status lookup, including opt-in file selection and redaction of email, CPF/tax id, tokens, encrypted card data, 3DS ids, Pix copy-paste text, and QR base64 values.
- Kept controllers, DTOs, Swagger setup, route contracts, payment creation flows, webhook controller behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted payment tests after self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/pagbank-payment.gateway.test.ts test/contexts/payments/payment-processor.test.ts`
- `pnpm --filter api test:unit` - 137 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Scoped gateway port/domain dependency scan returned no Nest, MikroORM, entity, controller, DTO, adapter, websocket, or module imports.
- Scoped strictness scan over touched gateway/service/module/test files returned no `any` or non-null assertions.
- `rg` confirmed the temporary legacy gateway adapter, its test, and `getPagBankOrder` references were removed.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `GET /api/payments/b6fb9654-7937-428b-8a3b-6ea68e168459/status` returned `200` with keys `orderId`, `orderStatus`, and `paymentStatus`, preserving the no-payment local status response.

Self-review:
- `PagBankPaymentGateway` is the only new status-lookup file that knows ConfigService, fetch, PagBank URLs, evidence files, and concrete PagBank response payloads.
- The gateway starts external payload handling from `unknown`, narrows the PagBank order response before mapping it, and delegates status priority to `PaymentStatusPolicy`.
- The first self-review found that malformed `error_messages` arrays could produce an empty error string; the adapter now falls back to the generic status message, and targeted tests plus typecheck were rerun before the full gate.
- The broad payment application dependency scan still reports the known temporary payment use-case bridges to `PaymentsService`; those were pre-existing and are tracked as remaining Phase 7 cleanup.
- No controller, DTO, route, or Swagger-visible file was touched in this slice.

Risks:
- `PaymentsService` still contains concrete PagBank HTTP/evidence code for Pix, credit-card, debit-card, 3DS, and QR-code payment creation flows.
- Evidence sanitization is now duplicated between `PaymentsService` and `PagBankPaymentGateway`; a later gateway creation slice should consolidate that infrastructure when payment creation moves behind the gateway.
- Payment controller use cases still bridge to `PaymentsService`.
- This slice did not call the real PagBank gateway; adapter behavior is covered with mocked `fetch`, fresh Nest boot, smoke, and a local status route check that does not require an external payment id.
- Next recommended slice is to move Pix payment creation behind the `PaymentGateway` port with a fake-gateway use-case test, preserving server-calculated totals, pending-payment persistence, QR base64 fetch/evidence behavior, and route response shape.

### 2026-05-07 - Phase 7 - Pix payment creation gateway slice

Status: Done

Changed:
- Extended `PaymentGateway` with Pix payment creation input/result models.
- Replaced the temporary `CreatePixPaymentUseCase` legacy-service bridge with a use case that loads the payment order through `PaymentOrderRepository`, calls `PaymentGateway.createPixPayment`, then marks the order payment pending.
- Moved Pix PagBank `/orders` creation payload mapping, notification URL selection, QR base64 lookup, and Pix evidence capture into `PagBankPaymentGateway`.
- Removed `PaymentsService.createPixPayment`, its Pix-only DTO dependency, and its QR base64 helper.
- Updated `PaymentsModule` to wire `CreatePixPaymentUseCase` to `PAYMENT_ORDER_REPOSITORY` and `PAYMENT_GATEWAY`.
- Updated `PaymentsController.createPixPayment` to translate `PaymentOrderNotFoundError` into the existing `404` response while keeping the same route, DTO, and response shape.
- Added fake-port use-case tests for success, missing order, and gateway failure ordering.
- Expanded `PagBankPaymentGateway` tests for Pix payload mapping, notification URLs, QR base64 lookup, evidence writing, and redaction.
- Kept DTO files, route paths, card/debit/3DS behavior, webhook controller behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted payment tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/create-pix-payment.use-case.test.ts test/contexts/payments/pagbank-payment.gateway.test.ts test/contexts/payments/payment-processor.test.ts test/contexts/payments/payment-use-case-bridge.test.ts`
- `pnpm --filter api test:unit` - 140 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Narrow Pix gateway/use-case dependency scan returned no Nest, MikroORM, entity, controller, DTO, adapter, websocket, or module imports in the new application/domain surface.
- Scoped strictness scan over touched Pix gateway/use-case/controller/module/service/test files returned no `any` or non-null assertions.
- `rg` confirmed `PaymentsService.createPixPayment` is gone and Pix creation now routes through `CreatePixPaymentUseCase`.
- The broad payment application dependency scan still reports the known remaining card/debit/3DS/status legacy use-case bridges to `PaymentsService`.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/payments/pix` with a valid missing order id returned `404` and `Order 00000000-0000-4000-8000-000000000000 not found`.

Self-review:
- `CreatePixPaymentUseCase` no longer imports `PaymentsService`, Nest, controllers, DTOs, entities, MikroORM, queues, sockets, filesystem, or concrete PagBank code.
- `PagBankPaymentGateway` now owns Pix-specific external request mapping and starts PagBank response parsing from `unknown`.
- The controller touched in this slice follows the Swagger guide constraints for the current project state: regular imports only, no manual `@Api*` decorators, and no DTO/schema changes.
- Transaction guidance is preserved: the use case does not open a DB transaction around the external PagBank call; it keeps the previous order of operations, gateway call first and pending-payment persistence afterward.
- No code fixes were needed after the self-review pass; verification had already passed against the intended final scope.

Risks:
- If `markPaymentPending` fails after PagBank creates the Pix order, the local order can still miss the external payment id; this was already true in the legacy flow and should be addressed later with reconciliation/idempotency support rather than by wrapping a gateway call in a DB transaction.
- `PaymentsService` still contains concrete PagBank HTTP/evidence code for credit-card, debit-card, and 3DS flows.
- Evidence and request infrastructure is still duplicated between `PaymentsService` and `PagBankPaymentGateway` until the remaining payment creation flows move behind the gateway.
- This slice did not call the real PagBank gateway; Pix adapter behavior is covered with mocked `fetch`, fresh Nest boot, smoke, and a missing-order route check that avoids external calls.
- Next recommended slice is to move credit-card payment creation behind the `PaymentGateway` port, preserving gateway payload shape, `applyGatewayStatus`, paid-order realtime emission, and existing response fields.

### 2026-05-07 - Phase 7 - Credit-card payment creation gateway slice

Status: Done

Changed:
- Extended `PaymentGateway` with credit-card payment creation input/result models.
- Replaced the temporary `CreateCardPaymentUseCase` legacy-service bridge with a use case that validates the encrypted-card input, loads the payment order through `PaymentOrderRepository`, calls `PaymentGateway.createCreditCardPayment`, applies the returned gateway status through `applyGatewayStatus`, and emits paid-order realtime notifications through `PaymentRealtimeNotifier`.
- Moved credit-card PagBank `/orders` charge payload mapping and card status-detail parsing into `PagBankPaymentGateway`.
- Removed `PaymentsService.createCardPayment` and its direct `CreateCardPaymentDto` dependency.
- Updated `PaymentsModule` to wire `CreateCardPaymentUseCase` to `PAYMENT_ORDER_REPOSITORY`, `PAYMENT_GATEWAY`, and `PAYMENT_REALTIME_NOTIFIER`.
- Updated `PaymentsController.createCardPayment` to translate application missing-order and input errors into the existing `404` and `400` HTTP responses while keeping the same route, DTO, and response shape.
- Added fake-port use-case tests for success, missing encrypted card, missing order, and gateway failure ordering.
- Expanded `PagBankPaymentGateway` tests for credit-card payload mapping, status detail mapping, and encrypted-card evidence redaction.
- Kept payment DTO files, route paths, debit-card behavior, 3DS behavior, webhook behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted payment tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/create-card-payment.use-case.test.ts test/contexts/payments/create-pix-payment.use-case.test.ts test/contexts/payments/pagbank-payment.gateway.test.ts test/contexts/payments/payment-processor.test.ts test/contexts/payments/payment-use-case-bridge.test.ts`
- `pnpm --filter api test:unit` - 144 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks from the plan returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over touched credit-card gateway/use-case/controller/module/service/test files returned no `any` or non-null assertions.
- Swagger scan over the touched payment controller/DTO/module files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Broad payment application dependency scan still reports the known remaining debit-card, 3DS-session, and status lookup legacy use-case bridges to `PaymentsService`.
- `rg` confirmed `PaymentsService.createCardPayment` and `PaymentsService['createCardPayment']` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/payments/credit-card` with a valid missing order id returned `404` and `Order 00000000-0000-4000-8000-000000000000 not found`.
- Local route check for `POST /api/payments/credit-card` with an empty encrypted card returned `400` and `PagBank encrypted card is required`.

Self-review:
- `CreateCardPaymentUseCase` no longer imports `PaymentsService`, Nest, controllers, DTOs, entities, MikroORM, queues, sockets, filesystem, or concrete PagBank code.
- `PagBankPaymentGateway` owns the external credit-card request mapping and starts PagBank response parsing from `unknown`.
- Paid-order realtime emission remains after gateway-status persistence, matching the legacy route behavior.
- The controller touched in this slice follows the Swagger guide constraints for the current project state: regular imports only, no manual `@Api*` decorators, and no DTO/schema changes.
- Transaction guidance is preserved: the use case does not open a DB transaction around the external PagBank call; it keeps the previous order of operations, gateway call first and local status application afterward.
- No code fixes were needed after the self-review pass; verification had already passed against the intended final scope.

Risks:
- If `applyGatewayStatus` fails after PagBank creates the credit-card order, the local order can still miss the external payment id/status; this was already true in the legacy flow and should be addressed later with reconciliation/idempotency support rather than by wrapping a gateway call in a DB transaction.
- `PaymentsService` still contains concrete PagBank HTTP/evidence code for debit-card and 3DS flows.
- Evidence and request infrastructure is still duplicated between `PaymentsService` and `PagBankPaymentGateway` until the remaining payment creation flows move behind the gateway.
- This slice did not call the real PagBank gateway; credit-card adapter behavior is covered with mocked `fetch`, fresh Nest boot, smoke, and local route checks that avoid external calls.
- Next recommended slice is to move debit-card payment creation behind the `PaymentGateway` port, preserving 3DS authentication id handling, debit payload shape, `applyGatewayStatus`, paid-order realtime emission, and existing response fields.

### 2026-05-07 - Phase 7 - Debit-card payment creation gateway slice

Status: Done

Changed:
- Extended `PaymentGateway` with debit-card payment creation input/result support.
- Replaced the temporary `CreateDebitCardPaymentUseCase` legacy-service bridge with a use case that validates encrypted-card and 3DS authentication inputs, loads the payment order through `PaymentOrderRepository`, enforces debit-card order intent, calls `PaymentGateway.createDebitCardPayment`, applies the returned gateway status, and emits paid-order realtime notifications through `PaymentRealtimeNotifier`.
- Moved debit-card PagBank `/orders` charge payload mapping, 3DS `authentication_method` mapping, notification URL selection, and card status-detail parsing into `PagBankPaymentGateway`.
- Refactored `PagBankPaymentGateway` to share credit/debit charge creation while preserving credit-card payload behavior.
- Removed `PaymentsService.createDebitCardPayment`, its direct debit DTO dependency, its orders-api request helper code, and its order payload mapping helpers.
- Kept `PaymentsService` limited to 3DS SDK session creation and status sync bridge behavior for the remaining payment legacy surface.
- Updated `PaymentsModule` to wire `CreateDebitCardPaymentUseCase` to `PAYMENT_ORDER_REPOSITORY`, `PAYMENT_GATEWAY`, and `PAYMENT_REALTIME_NOTIFIER`.
- Updated `PaymentsController.createDebitCardPayment` to translate application missing-order and input errors into the existing `404` and `400` HTTP responses while keeping the same route, DTO, and response shape.
- Added fake-port use-case tests for success, missing encrypted card, missing 3DS authentication id, missing order, wrong payment method, and gateway failure ordering.
- Expanded `PagBankPaymentGateway` tests for debit-card payload mapping, 3DS authentication mapping, notification URLs, status detail mapping, and evidence redaction of the 3DS authentication id.
- Kept payment DTO files, route paths, 3DS-session behavior, webhook behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted payment tests before self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/create-debit-card-payment.use-case.test.ts test/contexts/payments/create-card-payment.use-case.test.ts test/contexts/payments/create-pix-payment.use-case.test.ts test/contexts/payments/pagbank-payment.gateway.test.ts test/contexts/payments/payment-processor.test.ts test/contexts/payments/payment-use-case-bridge.test.ts` - 23 tests passed.
- Targeted payment tests after self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/create-debit-card-payment.use-case.test.ts test/contexts/payments/create-card-payment.use-case.test.ts test/contexts/payments/create-pix-payment.use-case.test.ts test/contexts/payments/pagbank-payment.gateway.test.ts test/contexts/payments/payment-processor.test.ts test/contexts/payments/payment-use-case-bridge.test.ts` - 23 tests passed.
- `pnpm --filter api test:unit` - 150 tests passed after the self-review fix.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks from the plan returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over touched debit-card gateway/use-case/controller/module/service/test files returned no `any` or non-null assertions.
- Swagger scan over the touched payment controller/DTO/module files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Broad payment application dependency scan now reports only the known remaining 3DS-session and status lookup legacy use-case bridges to `PaymentsService`.
- `rg` confirmed `PaymentsService.createDebitCardPayment` and `PaymentsService['createDebitCardPayment']` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/payments/debit-card` with a valid missing order id returned `404` and `Order 00000000-0000-4000-8000-000000000000 not found`.
- Local route check for `POST /api/payments/debit-card` with an empty encrypted card returned `400` and `PagBank encrypted card is required`.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `CreateDebitCardPaymentUseCase` no longer imports `PaymentsService`, Nest, controllers, DTOs, entities, MikroORM, queues, sockets, filesystem, or concrete PagBank code.
- `PagBankPaymentGateway` owns the external debit-card request mapping and starts PagBank response parsing from `unknown`.
- Paid-order realtime emission remains after gateway-status persistence, matching the legacy route behavior.
- The controller touched in this slice follows the Swagger guide constraints for the current project state: regular imports only, no manual `@Api*` decorators, and no DTO/schema changes.
- Transaction guidance is preserved: the use case does not open a DB transaction around the external PagBank call; it keeps the previous order of operations, gateway call first and local status application afterward.
- Self-review found one remaining broad `unknown` type assertion in `PaymentsService.formatPagBankError`; it was replaced with an explicit record guard, and targeted tests, API typecheck, full unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scan, and Swagger scan were rerun.

Risks:
- If `applyGatewayStatus` fails after PagBank creates the debit-card order, the local order can still miss the external payment id/status; this was already true in the legacy flow and should be addressed later with reconciliation/idempotency support rather than by wrapping a gateway call in a DB transaction.
- `PaymentsService` still contains concrete PagBank SDK/evidence code for 3DS session creation and remains the bridge for status lookup use-case orchestration.
- Evidence and request infrastructure is still duplicated between `PaymentsService` and `PagBankPaymentGateway` until 3DS/session behavior moves behind a dedicated gateway or SDK port.
- This slice did not call the real PagBank gateway; debit-card adapter behavior is covered with mocked `fetch`, fresh Nest boot, smoke, and local route checks that avoid external calls.
- Next recommended slice is to move 3DS session creation behind a gateway or payment SDK port, preserving SDK URL selection, evidence logging/redaction, and session response shape.

### 2026-05-07 - Phase 7 - 3DS session gateway slice

Status: Done

Changed:
- Extended `PaymentGateway` with `create3dsSession()` and a `Payment3dsSessionResult` model.
- Replaced the temporary `CreatePayment3dsSessionUseCase` legacy-service bridge with a use case that calls `PaymentGateway.create3dsSession`.
- Moved PagBank SDK `/checkout-sdk/sessions` request handling, SDK URL selection, response parsing, error formatting, evidence logging, and 3DS session redaction into `PagBankPaymentGateway`.
- Removed `PaymentsService.createPagBank3dsSession`, its ConfigService dependency, and its remaining PagBank SDK/evidence helper code.
- Kept `PaymentsService` as the remaining payment status lookup bridge only.
- Updated `PaymentsModule` so `CreatePayment3dsSessionUseCase` is wired to `PAYMENT_GATEWAY` instead of `PaymentsService`.
- Added fake-gateway use-case tests for successful 3DS session creation and gateway error propagation.
- Expanded `PagBankPaymentGateway` tests for SDK URL override, auth header, session response mapping, evidence service classification, and session redaction.
- Kept controllers, DTOs, route paths, payment status lookup behavior, Pix/credit/debit behavior, webhook behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted payment tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/create-payment-3ds-session.use-case.test.ts test/contexts/payments/pagbank-payment.gateway.test.ts test/contexts/payments/payment-use-case-bridge.test.ts test/contexts/payments/create-card-payment.use-case.test.ts test/contexts/payments/create-debit-card-payment.use-case.test.ts test/contexts/payments/create-pix-payment.use-case.test.ts test/contexts/payments/payment-processor.test.ts` - 25 tests passed.
- `pnpm --filter api test:unit` - 152 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks from the plan returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over touched 3DS gateway/use-case/module/service/test files returned no `any` or non-null assertions.
- Swagger scan over the payment controller/DTO/module files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Broad payment application dependency scan now reports only the known remaining status lookup legacy use-case bridge to `PaymentsService`.
- `rg` confirmed `PaymentsService.createPagBank3dsSession` and `PaymentsService['createPagBank3dsSession']` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `PAGBANK_ACCESS_TOKEN= pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `POST /api/payments/3ds-session` with `PAGBANK_ACCESS_TOKEN` intentionally blank returned `400` and `PagBank access token is not configured`, verifying local route/use-case/gateway wiring without making an external SDK call.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `CreatePayment3dsSessionUseCase` no longer imports `PaymentsService`, Nest, controllers, DTOs, entities, MikroORM, queues, sockets, filesystem, or concrete PagBank code.
- `PagBankPaymentGateway` now owns both PagBank Orders API and SDK API evidence behavior, so `PaymentsService` no longer duplicates PagBank request/evidence infrastructure.
- `PaymentsService` is reduced to status lookup orchestration through payment ports and remains temporary until `GetPaymentStatusUseCase` is moved off the legacy bridge.
- No controller, DTO, route, or Swagger-visible file was touched in this slice.
- Transaction guidance is not implicated by this slice because 3DS session creation has no database write.
- No code fixes were needed after the self-review pass; verification had already passed against the intended final scope.

Risks:
- `PaymentsService` still remains as a Nest bridge for payment status lookup orchestration.
- `GetPaymentStatusUseCase` still imports `PaymentsService`, which is now the only broad payment application dependency scan hit.
- This slice did not call the real PagBank SDK; adapter behavior is covered with mocked `fetch`, fresh Nest boot, smoke, and a no-token local route check that avoids external calls.
- Next recommended slice is to move payment status lookup orchestration into `GetPaymentStatusUseCase` using `PaymentOrderRepository`, `PaymentGateway`, and `PaymentRealtimeNotifier`, then remove `PaymentsService` if no callers remain.

### 2026-05-07 - Phase 7 - Payment status lookup use-case slice

Status: Done

Changed:
- Replaced the final temporary `GetPaymentStatusUseCase` legacy-service bridge with direct orchestration through `PaymentOrderRepository`, `PaymentGateway`, and `PaymentRealtimeNotifier`.
- Added `PaymentStatusSyncReporter` as an application port plus a Nest logger adapter to preserve the previous warning behavior when gateway status synchronization fails.
- Moved missing-order handling into an application error (`PaymentStatusOrderNotFoundError`) and kept HTTP translation in `PaymentsController`.
- Removed `PaymentsService` from the module providers/exports and deleted `apps/api/src/modules/payments/payments.service.ts`.
- Deleted the obsolete payment use-case bridge test and added direct fake-port tests for local status return, pending gateway synchronization, sync failure reporting, and missing orders.
- Kept payment DTO files, route paths, Swagger-visible schema behavior, Pix/credit/debit/3DS creation behavior, webhook behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted payment tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/get-payment-status.use-case.test.ts test/contexts/payments/create-payment-3ds-session.use-case.test.ts test/contexts/payments/create-card-payment.use-case.test.ts test/contexts/payments/create-debit-card-payment.use-case.test.ts test/contexts/payments/create-pix-payment.use-case.test.ts test/contexts/payments/pagbank-payment.gateway.test.ts test/contexts/payments/payment-processor.test.ts test/contexts/payments/mikro-orm-payment-order.repository.test.ts` - 37 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 155 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks from the plan returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over touched status use-case, port, adapter, controller, module, and test files returned no `any` or non-null assertions.
- Swagger scan over the touched payment controller/DTO/module files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Broad payment application dependency scan returned no legacy `PaymentsService`, Nest, DTO, module, adapter, controller, entity, MikroORM, socket, or concrete PagBank imports.
- `rg` confirmed `PaymentsService`, `payments.service`, `payment-use-case-bridge`, `legacy payments service`, and `LegacyPayment` references are gone from source and tests.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local route check for `GET /api/payments/00000000-0000-4000-8000-000000000000/status` returned `404` and `Order 00000000-0000-4000-8000-000000000000 not found`.
- Local route check for `GET /api/payments/b6fb9654-7937-428b-8a3b-6ea68e168459/status` returned `200` with `pending_payment` and `paymentStatus: null`.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `GetPaymentStatusUseCase` no longer imports `PaymentsService`, Nest, controllers, DTOs, entities, MikroORM, queues, sockets, filesystem, adapters, or concrete PagBank code.
- The use case remains a thin orchestrator: it loads the order, decides whether a gateway sync is needed, applies the gateway status through the repository port, emits the existing paid-order notification, and reports sync failures through a port.
- The old behavior that swallows gateway/apply/notification sync failures and returns the local order status is preserved, with logging moved behind `PaymentStatusSyncReporter`.
- The controller touched in this slice follows the Swagger guide constraints for the current project state: regular imports only, no manual `@Api*` decorators, and no DTO/schema changes.
- Transaction guidance is preserved: the use case does not open a DB transaction around the external PagBank status call; gateway status application remains a repository operation after the external lookup.
- No code fixes were needed after the self-review pass; verification had already passed against the intended final scope.

Risks:
- Gateway status synchronization still intentionally returns the local stale status when PagBank lookup, local status application, or realtime notification fails; this preserves the legacy route behavior and now reports the failure through a port.
- The local live route checks avoided real PagBank calls; adapter status lookup behavior remains covered by mocked `fetch` in `PagBankPaymentGateway` tests.
- Payment webhook module wiring still contains inline adapter factories and legacy helper functions in the Nest module boundary.
- Next recommended slice is to replace the remaining inline payment webhook adapter factories with concrete adapter classes for signature verification, webhook job creation, queue enqueueing, and webhook settings while preserving the current route and queue behavior.

### 2026-05-07 - Phase 7 - Payment webhook adapter wiring slice

Status: Done

Changed:
- Added provider tokens for `PaymentWebhookSettings`, `PaymentWebhookSignatureVerifier`, `PaymentWebhookJobFactory`, and `PaymentWebhookQueue`.
- Replaced the inline `HandlePagBankWebhookUseCase` factories in `PaymentsModule` with concrete adapter providers.
- Added `ConfigPaymentWebhookSettings` for `PAGBANK_WEBHOOK_TOKEN` and production-mode lookup.
- Added `PagBankWebhookSignatureVerifier` for SHA-256 raw-body signature verification.
- Added `PagBankWebhookJobFactory` for unknown PagBank payload narrowing, payment id fallback, card-reference normalization, status mapping, ignored charge handling, and received-at creation.
- Added `BullMqPaymentWebhookQueue` for the existing `process-payment` BullMQ job contract.
- Deleted the legacy module helper file `apps/api/src/modules/payments/pagbank-webhook.ts`.
- Updated the older Playwright webhook spec to exercise the new adapters directly and removed its `any` cast.
- Kept controllers, DTOs, route paths/contracts, payment creation/status behavior, processor behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Targeted webhook/payment tests before self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/payments/pagbank-webhook.adapters.test.ts test/contexts/payments/handle-pagbank-webhook.use-case.test.ts test/contexts/payments/payment-processor.test.ts` - 13 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 161 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks from the plan returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over touched webhook ports, adapters, module, API tests, and Playwright spec returned no `any` or non-null assertions.
- Swagger scan over the payment module/DTO surface returned no `import type` in controller/DTO files and no manual `@Api*` decorators; no controller or DTO was changed in this slice.
- Broad payment application dependency scan returned no legacy `PaymentsService`, Nest, DTO, module, adapter, controller, entity, MikroORM, socket, or concrete PagBank imports.
- Stale helper scan confirmed `verifyPagBankWebhookSignature`, `buildPagBankWebhookJob`, `enqueuePagBankWebhookJob`, `normalizePagBankReferenceId`, `mapPagBankStatus`, and `modules/payments/pagbank-webhook` references are gone from source and tests.
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- First Playwright run with the config default API URL timed out waiting for port `3001`; this was the known local workspace mismatch. After clearing ports and setting `NEXT_PUBLIC_API_URL=http://localhost:3334`, `NEXT_PUBLIC_API_URL=http://localhost:3334 pnpm test:e2e tests/pagbank/pagbank-webhook.spec.ts` passed 6 tests.
- Fresh API boot through `pnpm --filter api dev`
- `pnpm smoke:api`
- Local unsigned webhook route check returned `403` and `Invalid PagBank webhook signature`, matching the configured local webhook token behavior.
- `zsh -ic 'killport 3334'` after stopping the dev server.
- Self-review fix rerun: targeted webhook/payment tests passed 13 tests, `pnpm --filter api exec tsc --noEmit --pretty false`, `git diff --check`, `pnpm --filter api test:unit` passed 161 tests, `pnpm --filter api build`, and the boundary/stale-reference scans were rerun cleanly.

Self-review:
- `HandlePagBankWebhookUseCase` remains a thin application orchestrator; all webhook settings, signature verification, payload mapping, and BullMQ enqueueing now live behind ports.
- Payment application/domain code still has no Nest, BullMQ, controller, DTO, module, or concrete adapter imports.
- The new adapters start external webhook payload handling from `unknown` and narrow through record/string checks.
- The queue adapter preserves the previous job name, job id, attempts, and backoff options.
- The signature adapter preserves the previous raw-body SHA-256 `token-payload` behavior and timing-safe comparison.
- Self-review found mutable webhook port data shapes; `PaymentWebhookJob` and `BuildPaymentWebhookJobInput` fields were made `readonly`, the focused checks and full API unit/build checks were rerun, and scans remained clean.

Risks:
- This slice does not change webhook processor behavior; `PaymentProcessor` still owns BullMQ job execution as a Nest processor and remains adapter-layer infrastructure.
- The live route checks avoided a real PagBank webhook call; signature, mapping, queue options, and route wiring are covered by focused tests, Playwright adapter spec, fresh Nest boot, and smoke.
- Next recommended slice is to inspect whether Phase 7 has any remaining payment-context cleanup; if payment is clean, move to the next unchecked phase from the plan rather than expanding payment behavior further.

### 2026-05-07 - Phase 8 - Admin category read use-case slice

Status: Done

Changed:
- Started Phase 8 with the admin category read path only.
- Added `AdminCategoryReadModel`, `AdminCategoryReadRepository`, `ListAdminCategoriesUseCase`, and `MikroOrmAdminCategoryReadRepository`.
- Moved `GET /api/admin/categories` off `AdminService.listCategories()` and onto `ListAdminCategoriesUseCase`.
- Removed `AdminService.listCategories()` while leaving category create/update/delete/reorder mutations in the legacy service for later slices.
- Added Swagger-visible adapter DTOs for admin category responses and weekly schedules, plus a mapper from application read models to response DTOs.
- Cleaned touched category request DTOs for the Swagger/OOP rules: regular runtime DTO imports, explicit member accessibility, JSDoc descriptions, nested schedule DTO validation, and no definite assignment assertion.
- Kept route paths, guards, admin category mutations, product/extra/option-group/order/dashboard behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused admin tests before the Swagger DTO self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts` - 2 tests passed.
- Focused admin tests after the Swagger DTO self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/modules/admin/admin-category.mapper.test.ts` - 3 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 164 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks from the plan returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over the new admin application files, admin category adapter, touched controller/module/DTO/mapper files, and new tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller/category DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed `adminService.listCategories` and `AdminService.listCategories()` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/categories`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/categories` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `ListAdminCategoriesUseCase` is a thin orchestrator and depends only on an application repository port.
- The MikroORM adapter owns entity querying, relation population, and read-model mapping; application code does not import MikroORM, Nest, controllers, DTOs, or adapters.
- The admin route path and guard stayed stable.
- Self-review found the initial controller return type was an application read-model type alias, which would not satisfy the Swagger guide. The controller now returns `AdminCategoryResponseDto[]` through an adapter mapper, and focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route guard check were rerun.
- DTO changes were limited to the touched category route contract and use runtime-visible classes instead of manual `@Api*` decorators.

Risks:
- This slice did not execute an authenticated `GET /api/admin/categories` request against local data; repository/use-case/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- `AdminService` still contains legacy category mutations plus product, extra, option-group, featured, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those were outside this read-only slice and remain tracked for later Phase 8 cleanup.
- Next recommended slice is a narrow admin category mutation path behind write ports/use cases, starting with the smallest safe route such as category reorder or category update.

### 2026-05-07 - Phase 8 - Admin category reorder use-case slice

Status: Done

Changed:
- Added `AdminCategoryWriteRepository` for category write operations and `ReorderAdminCategoriesUseCase` for `PATCH /api/admin/categories/reorder`.
- Added `MikroOrmAdminCategoryWriteRepository` so category reorder persistence uses the shared `TransactionContext` provided by the use case-owned unit of work.
- Updated `AdminModule` to wire the category write repository, `MikroOrmUnitOfWork`, and reorder use case.
- Updated `AdminController.reorderCategories` to call `ReorderAdminCategoriesUseCase` and return `ReorderCategoriesResponseDto`.
- Removed `AdminService.reorderCategories()` while leaving category create/update/delete and other admin mutations in the legacy service for later slices.
- Cleaned the shared `ReorderDto` request contract for Swagger/OOP rules: exported nested DTO class, explicit member accessibility, JSDoc descriptions, and no definite assignment assertions.
- Kept route paths, guards, category create/update/delete, product/extra/option-group/order/dashboard behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused admin tests after fixing the new test syntax: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 5 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 166 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks from the plan returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over the new reorder application files, category write adapter, touched controller/module/DTO files, and new tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and reorder DTO/response DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- DTO hydration probe through the API tsconfig validated `ReorderDto` with zero errors for a valid UUID/sort order item.
- `rg` confirmed `adminService.reorderCategories` and `AdminService.reorderCategories()` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/categories/reorder`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PATCH /api/admin/categories/reorder` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `ReorderAdminCategoriesUseCase` owns the write transaction boundary and passes the transaction context to the repository port.
- `MikroOrmAdminCategoryWriteRepository` is the only new reorder file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves the legacy behavior of silently skipping missing category ids and flushing once after applying all found sort orders.
- The controller route path and guard stayed stable, and the controller no longer sends HTTP DTOs into application code.
- Self-review found syntax mistakes in the initial focused test files; those were fixed, then focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, DTO validation probe, fresh boot, smoke, and route guard check were rerun.

Risks:
- This slice did not execute an authenticated category reorder against local data to avoid mutating category order during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- `AdminService` still contains legacy category create/update/delete plus product, extra, option-group, featured, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is another narrow admin category mutation, likely category delete or update behind a write port/use case, preserving current soft-delete/update behavior and response shape.

### 2026-05-07 - Phase 8 - Admin category delete use-case slice

Status: Done

Changed:
- Moved `DELETE /api/admin/categories/:id` off `AdminService.deleteCategory()` and onto `DeleteAdminCategoryUseCase`.
- Extended `AdminCategoryWriteRepository` with `softDelete(id, context)` and implemented it in `MikroOrmAdminCategoryWriteRepository`.
- Kept the category delete write transaction owned by the use case through `MikroOrmUnitOfWork`.
- Added `AdminCategoryNotFoundError` in the application layer and kept HTTP translation in `AdminController` as the existing `404` message `Category not found`.
- Added `DeleteCategoryResponseDto` so the moved route has an explicit Swagger-visible response DTO.
- Removed `AdminService.deleteCategory()` while leaving category create/update and other admin behavior in the legacy service for later slices.
- Kept route path, guard, soft-delete behavior, category create/update, product/extra/option-group/order/dashboard behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- First focused admin test run found the existing reorder fake did not implement the newly required `softDelete` port method; fixed the fake and reran.
- Focused admin tests after the fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 9 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 170 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over the touched delete/reorder application files, category write adapter, controller/module/DTO files, and tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and category DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed `adminService.deleteCategory` and `AdminService.deleteCategory()` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/categories/:id` `DELETE`.
- `pnpm smoke:api`
- Local unauthenticated route check for `DELETE /api/admin/categories/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `DeleteAdminCategoryUseCase` is a thin orchestrator: it opens the transaction, asks the write port to soft-delete, translates a missing category into an application error, and returns the stable success result.
- `MikroOrmAdminCategoryWriteRepository` remains the only touched delete file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves the legacy soft-delete behavior for existing categories and avoids flushing when the category is missing.
- The controller route path and guard stayed stable, and the controller no longer sends HTTP DTOs or ORM entities into application code for this route.
- Self-review found no behavior drift after the focused fake-port fix; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route guard check were rerun.

Risks:
- This slice did not execute an authenticated category delete against local data to avoid mutating category state during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- `AdminService` still contains legacy category create/update plus product, extra, option-group, featured, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is another narrow admin category mutation, likely category update or create behind a write port/use case, preserving current normalization behavior and response shape.

### 2026-05-07 - Phase 8 - Admin category update use-case slice

Status: Done

Changed:
- Moved `PUT /api/admin/categories/:id` off `AdminService.updateCategory()` and onto `UpdateAdminCategoryUseCase`.
- Extended `AdminCategoryWriteRepository` with `update(id, data, context)` plus category mutation input/output models.
- Updated `MikroOrmAdminCategoryWriteRepository` to apply partial category updates, normalize `availabilitySchedule`, preserve omitted fields, flush inside the use-case-owned transaction context, and return a write-model projection.
- Added `UpdateAdminCategoryNotFoundError` in the application layer and kept HTTP translation in `AdminController` as the existing `404` message `Category not found`.
- Added `AdminCategoryMutationResponseDto` and a mapper so the moved route has an explicit Swagger-visible response DTO without leaking ORM entities.
- Removed `AdminService.updateCategory()` while leaving category create and other admin behavior in the legacy service for later slices.
- Kept route path, guard, partial update behavior, category create, product/extra/option-group/order/dashboard behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused admin tests before self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 14 tests passed.
- Self-review fix rerun of the same focused admin test command - 14 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 175 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over the touched update/delete/reorder application files, category write adapter, controller/module/DTO/mapper files, and tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and category DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed `adminService.updateCategory` and `AdminService.updateCategory()` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/categories/:id` `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PUT /api/admin/categories/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `UpdateAdminCategoryUseCase` is a thin orchestrator: it strips `id` out of the update data, opens the transaction, asks the write port to update, translates a missing category into an application error, and returns the write model.
- `MikroOrmAdminCategoryWriteRepository` remains the only touched update file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves the legacy partial update behavior: omitted fields are left unchanged, `availabilitySchedule: null` clears the schedule, and provided schedules are normalized before persistence.
- The controller route path and guard stayed stable, and the controller maps DTO fields into an application command instead of sending the DTO or ORM entity into application code.
- Self-review found the first use-case implementation passed the whole command, including `id`, as update data to the repository. The use case now strips `id` before calling the port, and focused tests plus the full verification gate were rerun.

Risks:
- This slice did not execute an authenticated category update against local data to avoid mutating category state during the refactor loop; transaction/use-case/adapter/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- `AdminService` still contains legacy category create plus product, extra, option-group, featured, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is category create behind the same write port/use-case, preserving current schedule normalization behavior and response shape.

### 2026-05-07 - Phase 8 - Admin category create use-case slice

Status: Done

Changed:
- Moved `POST /api/admin/categories` off `AdminService.createCategory()` and onto `CreateAdminCategoryUseCase`.
- Extended `AdminCategoryWriteRepository` with `create(data, context)` and a `CreateAdminCategoryData` command model.
- Updated `MikroOrmAdminCategoryWriteRepository` to create categories through the provided transaction context, preserve the legacy default `sortOrder` of `0`, normalize `availabilitySchedule`, flush once, and return a write-model projection.
- Updated `AdminController.createCategory` to map `CreateCategoryDto` fields into an application command and return `AdminCategoryMutationResponseDto` through the existing mapper.
- Updated `AdminModule` to wire `CreateAdminCategoryUseCase` through the write repository and `MikroOrmUnitOfWork`.
- Removed `AdminService.createCategory()` while leaving product, extra, option-group, featured, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, category response shape, product/extra/option-group/order/dashboard behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused admin tests before self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 16 tests passed.
- Self-review fix rerun of the same focused admin test command - 16 tests passed.
- `pnpm --filter api test:unit` - 177 tests passed before and after the self-review fix.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over the new create application files, category write port/adapter, admin controller/module, and category tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and category DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed `adminService.createCategory` and `AdminService.createCategory()` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/categories` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/admin/categories` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `CreateAdminCategoryUseCase` is a thin orchestrator: it opens the transaction and asks the write port to create the category inside that context.
- `MikroOrmAdminCategoryWriteRepository` remains the only touched create file that imports MikroORM transaction infrastructure, ORM entities, or schedule normalization.
- The adapter preserves legacy category create behavior: omitted `sortOrder` becomes `0`, omitted schedule is persisted as `null`, provided schedules are normalized, and the response includes the mutation projection.
- The controller route path and guard stayed stable, and the controller maps DTO fields into an application command instead of sending the DTO or ORM entity into application code.
- Self-review found the repository create test compared timestamps to themselves; the assertions now compare against fixed expected dates, and focused tests plus the full verification gate were rerun.

Risks:
- This slice did not execute an authenticated category create against local data to avoid mutating category state during the refactor loop; transaction/use-case/adapter/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- `AdminService` still contains legacy product, extra, option-group, featured, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is an admin product read path behind admin read ports/use cases, preserving current product payloads and query shape before moving product mutations.

### 2026-05-07 - Phase 8 - Admin product read use-case slice

Status: Done

Changed:
- Moved `GET /api/admin/products` off `AdminService.listProducts()` and onto `ListAdminProductsUseCase`.
- Added `AdminProductReadModel`, `AdminProductReadRepository`, `ListAdminProductsUseCase`, and `MikroOrmAdminProductReadRepository`.
- Preserved the legacy eager-loading and sort shape for admin product reads: `category`, `extras`, `optionGroups`, `optionGroups.options`, ordered by category sort order, product sort order, and product name.
- Added Swagger-visible admin product response DTO classes and an adapter mapper from application read models to response DTOs.
- Kept ORM collections and entities inside the MikroORM adapter; the controller returns DTOs and the application use case returns read models.
- Removed `AdminService.listProducts()` while leaving product mutations, extras, option groups, featured, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, product response shape, product mutations, extra/option-group behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- First focused admin test run found the product read repository test harness was using MikroORM `Collection.add()` without ORM metadata; replaced it with a small typed fake collection and reran.
- Focused admin tests after the fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 19 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 180 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Scoped strictness scan over the new product read application files, product read adapter, admin controller/module/product mapper/DTO files, and product read tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and admin product response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed `adminService.listProducts` and `AdminService.listProducts()` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/products` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `ListAdminProductsUseCase` is a thin orchestrator and depends only on an application repository port.
- `MikroOrmAdminProductReadRepository` is the only new product read file that imports MikroORM or ORM entities; it owns relation population, sorting, entity projection, price parsing, and ORM collection access.
- The adapter preserves the current product read payload fields and keeps entity defaulted booleans concrete for the Swagger-visible response DTO contract.
- The controller route path and guard stayed stable, and the controller maps application read models to DTO classes instead of returning application type aliases or ORM entities.
- Self-review found the initial focused repository test depended on MikroORM collection metadata; the test now uses a purpose-built fake collection, and focused tests plus the full verification gate were rerun.

Risks:
- This slice did not execute an authenticated `GET /api/admin/products` request against local data; repository/use-case/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- `AdminService` still contains legacy product mutations, extra, option-group, featured, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is a narrow admin product mutation behind write ports/use cases, starting with product reorder or product soft-delete/toggle before moving create/update.

### 2026-05-07 - Phase 8 - Admin product reorder use-case slice

Status: Done

Changed:
- Moved `PATCH /api/admin/products/reorder` off `AdminService.reorderProducts()` and onto `ReorderAdminProductsUseCase`.
- Added `AdminProductWriteRepository` with a narrow `reorder(items, context)` operation.
- Added `MikroOrmAdminProductWriteRepository` so product reorder persistence uses the shared `TransactionContext` provided by the use case-owned unit of work.
- Updated `AdminModule` to wire the product write repository and `ReorderAdminProductsUseCase`.
- Updated `AdminController.reorderProducts` to map the existing `ReorderDto` body into an application command and return `ReorderProductsResponseDto`.
- Removed `AdminService.reorderProducts()` while leaving product create/update/toggle/delete, extras, option groups, featured, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request body shape, response body shape, product create/update/toggle/delete, extra/option-group behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 21 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 182 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Diff-level strictness scan and new product reorder file scan returned no `any`, non-null assertions, or definite assignment assertions.
- Broad `AdminService` strictness scan still reports the known legacy dashboard/order-history `any` and non-null assertions outside this route slice.
- Swagger scan over the touched admin controller and product reorder response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed `adminService.reorderProducts`, `AdminService.reorderProducts()`, and `async reorderProducts` are gone from the legacy service; the remaining `reorderProducts` reference is the controller route method.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products/reorder` `PATCH`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PATCH /api/admin/products/reorder` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `ReorderAdminProductsUseCase` is a thin orchestrator: it opens the transaction, asks the write port to reorder products, and returns the stable success result.
- `MikroOrmAdminProductWriteRepository` is the only new product reorder file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy product reorder behavior: missing product ids are skipped, found products receive the provided `sortOrder`, and one flush happens after the loop.
- The controller route path and guard stayed stable, and the controller no longer sends HTTP DTOs into application code for this route.
- Self-review found no behavior drift or missing in-scope verification after the initial implementation; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated product reorder against local data to avoid mutating product order during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- `AdminService` still contains legacy product create/update/toggle/delete, extra, option-group, featured, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is another narrow admin product mutation behind the product write port, likely product soft-delete or toggle before moving create/update.

### 2026-05-07 - Phase 8 - Admin product soft-delete use-case slice

Status: Done

Changed:
- Moved `DELETE /api/admin/products/:id` off `AdminService.deleteProduct()` and onto `DeleteAdminProductUseCase`.
- Extended `AdminProductWriteRepository` with `softDelete(id, context)`.
- Updated `MikroOrmAdminProductWriteRepository` to soft-delete products by setting `isActive = false` through the provided transaction context.
- Added `AdminProductNotFoundError` in the application layer and kept HTTP translation in `AdminController` as the existing `404` message `Product not found`.
- Added `DeleteProductResponseDto` so the moved route has an explicit Swagger-visible response DTO.
- Updated `AdminModule` to wire `DeleteAdminProductUseCase` through the product write repository and `MikroOrmUnitOfWork`.
- Removed `AdminService.deleteProduct()` while leaving product create/update/toggle, extras, option groups, featured, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, soft-delete behavior, response body shape, product create/update/toggle, extra/option-group behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 25 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 186 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new product delete application file, product write port/adapter, product delete DTO, product write tests, and product delete test returned no `any`, non-null assertions, or definite assignment assertions.
- Diff-level strictness scan over the touched product delete route files returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and product delete/reorder DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed `adminService.deleteProduct`, `AdminService.deleteProduct()`, and `async deleteProduct` are gone from the legacy service; the remaining `deleteProduct` reference is the controller route method.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products/:id` `DELETE`.
- `pnpm smoke:api`
- Local unauthenticated route check for `DELETE /api/admin/products/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `DeleteAdminProductUseCase` is a thin orchestrator: it opens the transaction, asks the write port to soft-delete, translates a missing product into an application error, and returns the stable success result.
- `MikroOrmAdminProductWriteRepository` remains the only touched delete file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy product soft-delete behavior for existing products and avoids flushing when the product is missing.
- The controller route path and guard stayed stable, and the controller no longer sends HTTP DTOs or ORM entities into application code for this route.
- Self-review found no behavior drift or missing in-scope verification after the initial implementation; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated product delete against local data to avoid mutating product state during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- `AdminService` still contains legacy product create/update/toggle, extra, option-group, featured, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is product toggle behind the same product write port/use-case, preserving the existing `{ id, isActive }` response shape before moving product create/update.

### 2026-05-07 - Phase 8 - Admin product toggle use-case slice

Status: Done

Changed:
- Moved `PATCH /api/admin/products/:id/toggle` off `AdminService.toggleProduct()` and onto `ToggleAdminProductUseCase`.
- Extended `AdminProductWriteRepository` with `toggleActive(id, context)` returning the toggled product active state.
- Updated `MikroOrmAdminProductWriteRepository` to toggle `Product.isActive` through the provided transaction context and return `{ id, isActive }`.
- Moved `AdminProductNotFoundError` into a product-specific application error file shared by delete and toggle use cases.
- Added `ToggleProductResponseDto` so the moved route has an explicit Swagger-visible response DTO.
- Updated `AdminModule` to wire `ToggleAdminProductUseCase` through the product write repository and `MikroOrmUnitOfWork`.
- Removed `AdminService.toggleProduct()` while leaving product create/update, extras, option groups, featured, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, toggle behavior, response body shape, product create/update, extra/option-group behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 30 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 191 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new product toggle application file, product error file, product write port/adapter, product toggle DTO, product write tests, and product toggle test returned no `any`, non-null assertions, or definite assignment assertions.
- Diff-level strictness scan over the touched `AdminService` product toggle removal returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and product toggle/delete/reorder DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed `adminService.toggleProduct` and `AdminService.toggleProduct()` references are gone; the remaining `toggleProduct` reference is the controller route method.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products/:id/toggle` `PATCH`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PATCH /api/admin/products/00000000-0000-4000-8000-000000000000/toggle` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `ToggleAdminProductUseCase` is a thin orchestrator: it opens the transaction, asks the write port to toggle the product state, translates a missing product into an application error, and returns the stable `{ id, isActive }` result.
- `MikroOrmAdminProductWriteRepository` remains the only touched toggle file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy toggle behavior, including `product.isActive = !product.isActive`, one flush for found products, and no flush for missing products.
- The controller route path and guard stayed stable, and the controller no longer calls the legacy admin service for this route.
- Self-review found no behavior drift or missing in-scope verification after the initial implementation; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated product toggle against local data to avoid mutating product active state during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- `AdminService` still contains legacy product create/update, extra, option-group, featured, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is product create or update behind the product write port/use-case, with update likely safer before create because it can preserve existing mutation behavior around category lookup and optional promotional fields.

### 2026-05-07 - Phase 8 - Admin product update use-case slice

Status: Done

Changed:
- Moved `PUT /api/admin/products/:id` off `AdminService.updateProduct()` and onto `UpdateAdminProductUseCase`.
- Extended `AdminProductWriteRepository` with `update(id, data, context)` returning an explicit updated product mutation model or a typed missing-product/missing-category outcome.
- Updated `MikroOrmAdminProductWriteRepository` to update `Product` fields through the provided transaction context, including category lookup, decimal formatting, optional promotional fields, compound-product fields, loyalty redemption fields, and promo-field clearing when promotion is disabled.
- Added `AdminProductCategoryNotFoundError` beside `AdminProductNotFoundError` so the use case can translate repository outcomes without importing Nest exceptions.
- Added `AdminProductMutationResponseDto` and mapper coverage so the moved route has an explicit Swagger-visible response DTO.
- Updated `AdminController` to call the use case, map the response DTO, and translate product/category application errors to the legacy `404` messages.
- Updated `AdminModule` to wire `UpdateAdminProductUseCase` through the product write repository and `MikroOrmUnitOfWork`.
- Removed `AdminService.updateProduct()` while leaving product create, featured products, extras, option groups, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request DTO shape, product create, featured products, extras, option groups, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 38 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 199 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new product update application file, product error file, product write port/adapter, product mutation DTO, touched admin controller/module/mapper files, and product update tests returned no `any`, non-null assertions, or definite assignment assertions.
- Diff-level strictness scan over the touched `AdminService` product update removal returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and product update/toggle/delete/reorder DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed the legacy `adminService.updateProduct` call is gone; the remaining `updateProduct` reference is the controller route method.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products/:id` `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PUT /api/admin/products/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `UpdateAdminProductUseCase` is a thin orchestrator: it opens the transaction, sends the update command to the write port, translates typed missing-product/category outcomes into application errors, and returns the mutation model.
- `MikroOrmAdminProductWriteRepository` remains the only touched update file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves the legacy optional-field semantics, including category lookup only when a category id is supplied, `price.toFixed(2)`, nullable promotional price/date clearing, compound-product flags, redemption fields, one flush for found products, and no flush for missing products or missing categories.
- The controller route path and guard stayed stable, and the controller no longer calls the legacy admin service for this route.
- Self-review found no behavior drift or missing in-scope verification after the initial implementation; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated product update against local data to avoid mutating product/category state during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- The moved update route now returns an explicit DTO instead of a raw MikroORM entity, which is intentional for Swagger and adapter boundaries; the admin UI invalidates and refetches products after update rather than depending on the immediate mutation payload.
- `AdminService` still contains legacy product create, featured products, extras, option groups, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is product create behind the product write port/use-case before moving featured products, extras, and option groups.

### 2026-05-07 - Phase 8 - Admin product create use-case slice

Status: Done

Changed:
- Moved `POST /api/admin/products` off `AdminService.createProduct()` and onto `CreateAdminProductUseCase`.
- Extended `AdminProductWriteRepository` with `create(data, context)` returning an explicit created product mutation model or a typed missing-category outcome.
- Updated `MikroOrmAdminProductWriteRepository` to create `Product` rows through the provided transaction context, preserving category lookup, `price.toFixed(2)`, optional description/image fields, compound-product defaults, and loyalty redemption defaults.
- Reused `AdminProductCategoryNotFoundError`, `AdminProductMutationResponseDto`, and `toAdminProductMutationResponseDto` for the create route response and error translation.
- Updated `AdminController` to call the create use case, map the response DTO, and translate missing-category application errors to the legacy `404` message.
- Updated `AdminModule` to wire `CreateAdminProductUseCase` through the product write repository and `MikroOrmUnitOfWork`.
- Cleaned `CreateProductDto` for the Swagger/OOP rules: explicit public readonly fields, JSDoc descriptions, no definite assignment assertions, and no manual `@Api*` decorators.
- Removed `AdminService.createProduct()` while leaving featured products, extras, option groups, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request body shape, featured products, extras, option groups, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused product-create tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts` - 17 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 42 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 203 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new product create application file, product write port/adapter, product create DTO, product mutation DTO, touched admin controller/module files, and product create tests returned no `any`, non-null assertions, or definite assignment assertions.
- Diff-level strictness scan over the touched `AdminService` product create removal returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and product create/mutation/update/toggle/delete/reorder DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- `rg` confirmed the legacy `adminService.createProduct` call is gone; the remaining `createProduct` references are the controller route method and local test helper functions.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/admin/products` returned `401` and `{"message":"Unauthorized","statusCode":401}`, confirming the admin guard remains active without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `CreateAdminProductUseCase` is a thin orchestrator: it opens the transaction, sends the create command to the write port, translates typed missing-category outcomes into an application error, and returns the mutation model.
- `MikroOrmAdminProductWriteRepository` remains the only touched create file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves the legacy create behavior, including category lookup before creation, decimal text persistence, defaulting `isCompound` and `isRedeemable` to `false`, defaulting `redemptionCost` to `0`, one flush for created products, and no flush for a missing category.
- The controller route path and guard stayed stable, and the controller no longer calls the legacy admin service for this route.
- Self-review found no behavior drift or missing in-scope verification after the initial implementation; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated product create against local data to avoid inserting local products during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot and the 401 check.
- The moved create route now returns an explicit DTO instead of a raw MikroORM entity, matching the product update slice and Swagger boundary direction; the admin UI invalidates and refetches products after create rather than depending on the immediate mutation payload.
- `AdminService` still contains legacy featured products, extras, option groups, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is featured products or product extras behind admin application ports/use cases; extras and option groups have more nested mutation behavior, so featured products may be the smaller next slice.

### 2026-05-07 - Phase 8 - Admin featured products use-case slice

Status: Done

Changed:
- Moved `GET /api/admin/featured` off `AdminService.listFeatured()` and onto `ListAdminFeaturedProductsUseCase`.
- Added `AdminFeaturedProductReadModel` and extended `AdminProductReadRepository` with `listFeatured()`.
- Updated `MikroOrmAdminProductReadRepository` to preserve the legacy featured query shape: `isFeatured: true`, `category` populate, and `featuredOrder ASC` ordering.
- Moved `PUT /api/admin/featured` off `AdminService.setFeatured()` and onto `SetAdminFeaturedProductsUseCase`.
- Extended `AdminProductWriteRepository` with `setFeatured(productIds, context)` and implemented it in `MikroOrmAdminProductWriteRepository` through the use-case-owned transaction context.
- Preserved the legacy featured write behavior: clear all current featured products, set found product ids in request order, ignore missing ids, allow duplicate ids with the later order winning, and flush once.
- Added Swagger-visible `AdminFeaturedProductResponseDto`, `SetFeaturedProductsDto`, and `SetFeaturedProductsResponseDto`.
- Updated `AdminController`, `AdminModule`, and `admin-product.mapper.ts` so featured routes map DTOs at the adapter boundary and no longer call the legacy admin service.
- Removed `AdminService.listFeatured()` and `AdminService.setFeatured()` while leaving extras, option groups, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route paths, guards, product create/update/delete/toggle/reorder behavior, extras, option groups, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused featured/product tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 21 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 47 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 208 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new featured application files, product read/write ports, product adapters, admin controller/module/mapper/DTOs, and featured/product tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and featured/product DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- DTO validation probe for `SetFeaturedProductsDto` returned zero validation errors for a UUID product id array.
- Stale-reference scans confirmed `AdminService.listFeatured()`, `AdminService.setFeatured()`, `adminService.listFeatured`, and `adminService.setFeatured` are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/featured` `GET` and `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/featured` returned `401` and `{"message":"Unauthorized","statusCode":401}`.
- Local unauthenticated route check for `PUT /api/admin/featured` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `ListAdminFeaturedProductsUseCase` is a thin read orchestrator and depends only on the admin product read repository port.
- `SetAdminFeaturedProductsUseCase` owns the write transaction boundary and passes the transaction context to the repository port.
- `MikroOrmAdminProductReadRepository` and `MikroOrmAdminProductWriteRepository` remain the only touched featured files that import MikroORM/entities.
- The controller route paths and guard stayed stable, and the controller now uses explicit request/response DTO classes instead of inline body types or raw object responses.
- The write adapter preserves the legacy missing-id and duplicate-id semantics; focused adapter coverage asserts both behaviors plus the clear-current-featured behavior.
- No behavior fixes were needed after self-review; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, DTO validation, stale-reference scans, fresh boot, smoke, and route guard checks all passed.

Risks:
- This slice did not execute authenticated featured read/write requests against local data to avoid exposing or mutating admin state during the refactor loop; use-case/adapter/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus 401 checks.
- `SetFeaturedProductsDto` now makes the previously inline request body explicit and validates product ids as UUIDs for Swagger/class-validator metadata.
- `AdminService` still contains legacy extras, option groups, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is product extras behind admin application ports/use cases before moving the more nested option group and group option behavior.

### 2026-05-07 - Phase 8 - Admin product extras read use-case slice

Status: Done

Changed:
- Moved `GET /api/admin/products/:productId/extras` off `AdminService.listExtras()` and onto `ListAdminProductExtrasUseCase`.
- Added `AdminProductExtraListReadModel` and extended `AdminProductReadRepository` with `listExtras(productId)`.
- Updated `MikroOrmAdminProductReadRepository` to preserve the legacy extras lookup: `Product` by id with `extras` populated, no filtering of grouped option rows, and product-missing mapped to `null`.
- Added Swagger-visible `AdminProductExtraListResponseDto` with the existing list response keys: `id`, `name`, `price`, `imageUrl`, and `isActive`.
- Updated `AdminController`, `AdminModule`, and `admin-product.mapper.ts` so the extras read route maps application read models to response DTOs and translates `AdminProductNotFoundError` to the existing `404` message `Product not found`.
- Removed `AdminService.listExtras()` while leaving extra create/update/delete, option groups, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, response key shape, extra create/update/delete, option groups, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused extras/product tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 12 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 52 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 213 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new product-extra application files, product read port/adapter, admin controller/module/mapper/DTO, and extras/product tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and product-extra/product DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `AdminService.listExtras()` and `adminService.listExtras` are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products/:productId/extras` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/products/00000000-0000-4000-8000-000000000000/extras` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `ListAdminProductExtrasUseCase` is a thin read orchestrator: it calls the read port, translates missing products into an application error, and returns the read model list.
- `MikroOrmAdminProductReadRepository` remains the only touched extras read file that imports MikroORM/entities.
- The adapter intentionally preserves the legacy behavior of returning all `product.extras.getItems()` entries, including grouped option rows if the ORM relation contains them.
- The controller route path and guard stayed stable, and the controller now returns an explicit response DTO array instead of raw object literals from the legacy service.
- No behavior fixes were needed after self-review; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scan, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated extras read against local data to avoid exposing admin state during the refactor loop; use-case/adapter/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The legacy extras read shape may include grouped option rows because the old service used `product.extras.getItems()` without filtering; this slice preserved that behavior intentionally rather than correcting it.
- `AdminService` still contains legacy extra create/update/delete, option groups, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is product extra create behind an admin write port/use case, then product extra update/delete as separate small write slices.

### 2026-05-07 - Phase 8 - Admin product extra create use-case slice

Status: Done

Changed:
- Moved `POST /api/admin/products/:productId/extras` off `AdminService.createExtra()` and onto `CreateAdminProductExtraUseCase`.
- Added `AdminProductExtraWriteRepository`, `CreateAdminProductExtraUseCase`, and `MikroOrmAdminProductExtraWriteRepository`.
- Kept the extra create write transaction owned by the use case through `MikroOrmUnitOfWork`, with the repository using only the provided transaction context.
- Preserved legacy create behavior for product lookup, decimal text persistence through `price.toFixed(2)`, optional `imageUrl`, default `sortOrder`, default `isActive`, one flush for created extras, and no flush for missing products.
- Added Swagger-visible `AdminProductExtraMutationResponseDto` and a mapper from the application mutation model to the response DTO.
- Cleaned `CreateExtraDto` for the Swagger/OOP rules: explicit public readonly fields, JSDoc descriptions, no definite assignment assertions, and no manual `@Api*` decorators.
- Removed `AdminService.createExtra()` while leaving extra update/delete, option groups, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request body shape, extra update/delete, option groups, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- First focused product-extra-create test run found the use case forwarded `imageUrl: undefined` into the repository command; fixed the command mapping to omit absent optional fields and reran.
- Focused product-extra-create tests after the fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 9 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 57 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter api test:unit` - 218 tests passed.
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new product-extra write application files, product-extra write adapter, admin controller/module/mapper/DTO files, and product-extra tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and product-extra DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- DTO validation probe for `CreateExtraDto` returned zero validation errors for a valid name and numeric price.
- Stale-reference scans confirmed `AdminService.createExtra()` and `adminService.createExtra` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products/:productId/extras` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/admin/products/00000000-0000-4000-8000-000000000000/extras` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `CreateAdminProductExtraUseCase` is a thin orchestrator: it builds the repository command, opens the transaction, asks the write port to create the extra, translates typed missing-product outcomes into an application error, and returns the mutation model.
- `MikroOrmAdminProductExtraWriteRepository` is the only touched create-extra file that imports MikroORM transaction infrastructure or ORM entities.
- The controller route path and guard stayed stable, and the controller maps the HTTP DTO into an application command instead of sending DTOs or ORM entities into application code.
- The moved route now returns an explicit response DTO instead of a raw MikroORM entity; the admin UI invalidates and refetches products after saving extras, so it does not depend on the immediate mutation payload.
- After the optional-field mapping fix, focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, DTO validation, stale-reference scans, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated extra create against local data to avoid inserting local extras during the refactor loop; transaction/use-case/adapter/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The immediate create response is now an explicit adapter DTO rather than raw ORM serialization; this is aligned with the Swagger boundary rule but may expose fewer incidental ORM fields than the old raw entity response.
- `AdminService` still contains legacy extra update/delete, option groups, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is product extra update behind the same extra write port/use case, then product extra delete as a separate small write slice.

### 2026-05-07 - Phase 8 - Admin product extra update use-case slice

Status: Done

Changed:
- Moved `PUT /api/admin/extras/:id` off `AdminService.updateExtra()` and onto `UpdateAdminProductExtraUseCase`.
- Added `AdminProductExtraNotFoundError` and extended `AdminProductExtraWriteRepository` with `update(id, data, context)`.
- Updated `MikroOrmAdminProductExtraWriteRepository` to update extras through the provided transaction context, preserving legacy partial-update behavior for `name`, `price`, `imageUrl`, and `isActive`.
- Kept decimal text persistence through `price.toFixed(2)`, one flush for found extras, no flush for missing extras, and the existing `404` message `Extra not found`.
- Reused `AdminProductExtraMutationResponseDto` and `toAdminProductExtraMutationResponseDto` for the moved update route response.
- Cleaned `UpdateExtraDto` for the Swagger/OOP rules: explicit public readonly fields, JSDoc descriptions, no definite assignment assertions, and no manual `@Api*` decorators.
- Removed `AdminService.updateExtra()` while leaving extra delete, option groups, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request body shape, extra delete, option groups, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- First focused update test run found the existing create-use-case fake did not implement the newly required `update` port method; fixed the fake and reran.
- Focused product-extra update tests after the fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 14 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 62 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 223 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the product-extra application files, product-extra write adapter, admin controller/module/mapper/DTO files, and product-extra tests returned no `any`, non-null assertions, or definite assignment assertions.
- Diff-level strictness scan over the touched `AdminService` update-extra removal returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and product-extra DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- DTO validation probe for `UpdateExtraDto` returned zero validation errors for valid `name`, numeric `price`, and boolean `isActive`.
- Stale-reference scans confirmed `AdminService.updateExtra()` and `adminService.updateExtra` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/extras/:id` `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PUT /api/admin/extras/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `UpdateAdminProductExtraUseCase` is a thin orchestrator: it builds the partial update command, opens the transaction, asks the write port to update the extra, translates typed missing-extra outcomes into an application error, and returns the mutation model.
- `MikroOrmAdminProductExtraWriteRepository` remains the only touched update-extra file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves the legacy optional-field semantics: omitted fields are left unchanged, supplied price is formatted with `toFixed(2)`, supplied `isActive` can be `false`, and missing extras avoid flushing.
- The controller route path and guard stayed stable, and the controller maps the HTTP DTO into an application command instead of sending DTOs or ORM entities into application code.
- After the fake-port fix, focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, DTO validation, stale-reference scans, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated extra update against local data to avoid mutating local extras during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The moved update route now returns an explicit adapter DTO rather than raw ORM serialization; this is aligned with the Swagger boundary rule but may expose fewer incidental ORM fields than the old raw entity response.
- `AdminService` still contains legacy extra delete, option groups, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is product extra delete behind the same extra write port/use case, then option groups as separate smaller slices.

### 2026-05-07 - Phase 8 - Admin product extra delete use-case slice

Status: Done

Changed:
- Moved `DELETE /api/admin/extras/:id` off `AdminService.deleteExtra()` and onto `DeleteAdminProductExtraUseCase`.
- Extended `AdminProductExtraWriteRepository` with `softDelete(id, context)`.
- Updated `MikroOrmAdminProductExtraWriteRepository` to soft-delete extras through the provided transaction context by setting `isActive = false`.
- Kept the existing delete behavior: one flush for found extras, no flush for missing extras, `{ success: true }` response for successful deletes, and the existing `404` message `Extra not found`.
- Added Swagger-visible `DeleteExtraResponseDto` for the moved route response.
- Updated `AdminController` and `AdminModule` so the delete route maps through the application use case and no longer calls the legacy admin service.
- Removed `AdminService.deleteExtra()` while leaving option groups, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, response body shape, option groups, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused product-extra delete tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 18 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 66 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 227 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the product-extra application files, product-extra write adapter, admin controller/module/mapper/DTO files, and product-extra tests returned no `any`, non-null assertions, or definite assignment assertions.
- Diff-level strictness scan over the touched `AdminService` delete-extra removal returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and product-extra/delete DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `DeleteExtraResponseDto` returned `ok`.
- Stale-reference scans confirmed `AdminService.deleteExtra()` and `adminService.deleteExtra` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/extras/:id` `DELETE`.
- `pnpm smoke:api`
- Local unauthenticated route check for `DELETE /api/admin/extras/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `DeleteAdminProductExtraUseCase` is a thin orchestrator: it opens the transaction, asks the write port to soft-delete the extra, translates a missing extra into an application error, and returns the stable success result.
- `MikroOrmAdminProductExtraWriteRepository` remains the only touched delete-extra file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy soft-delete behavior and avoids flushing when the extra is missing.
- The controller route path and guard stayed stable, and the controller returns an explicit response DTO instead of raw object literals from the legacy service.
- Focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, response DTO probe, stale-reference scans, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated extra delete against local data to avoid mutating local extras during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- `AdminService` still contains legacy option groups, group options, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is option group read behind an admin read port/use case, then option group create/update/delete/reorder as separate smaller slices.

### 2026-05-07 - Phase 8 - Admin option group read use-case slice

Status: Done

Changed:
- Moved `GET /api/admin/products/:productId/option-groups` off `AdminService.listOptionGroups()` and onto `ListAdminOptionGroupsUseCase`.
- Added `AdminOptionGroupReadModel` and extended `AdminProductReadRepository` with `listOptionGroups(productId)`.
- Updated `MikroOrmAdminProductReadRepository` to preserve the legacy option-group lookup: `Product` by id with `optionGroups` and `optionGroups.options` populated, option groups sorted by `sortOrder`, options sorted by `sortOrder`, and product-missing mapped to `null`.
- Reused the existing Swagger-visible `AdminProductOptionGroupResponseDto` and exported the adapter mapper for this route response.
- Updated `AdminController` and `AdminModule` so the option group read route maps application read models to response DTOs and translates `AdminProductNotFoundError` to the existing `404` message `Product not found`.
- Removed `AdminService.listOptionGroups()` while leaving option group create/update/delete/reorder, group options, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, response key shape, option group mutations, group option mutations, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused option-group/product tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 18 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 71 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 232 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new option-group application files, product read port/adapter, admin controller/module/mapper files, and option-group/product tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and product response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `AdminService.listOptionGroups()` and `adminService.listOptionGroups` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products/:productId/option-groups` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/products/00000000-0000-4000-8000-000000000000/option-groups` returned `401` and `{"message":"Unauthorized","statusCode":401}` without exposing admin data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `ListAdminOptionGroupsUseCase` is a thin read orchestrator: it calls the read port, translates missing products into an application error, and returns the read model list.
- `MikroOrmAdminProductReadRepository` remains the only touched option-group read file that imports MikroORM/entities.
- The adapter preserves the legacy option group and nested option sorting/defaulting behavior while keeping ORM collections out of the controller response.
- The controller route path and guard stayed stable, and the controller now returns an explicit response DTO array instead of raw object literals from the legacy service.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scan, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated option-group read against local data to avoid exposing admin state during the refactor loop; use-case/adapter/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- `AdminService` still contains legacy option group create/update/delete/reorder, group option mutations, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is option group create behind an admin write port/use case, then option group update/delete/reorder as separate smaller write slices.

### 2026-05-07 - Phase 8 - Admin option group create use-case slice

Status: Done

Changed:
- Moved `POST /api/admin/products/:productId/option-groups` off `AdminService.createOptionGroup()` and onto `CreateAdminOptionGroupUseCase`.
- Added `AdminOptionGroupWriteRepository`, `CreateAdminOptionGroupUseCase`, and `MikroOrmAdminOptionGroupWriteRepository`.
- Added `AdminOptionGroupSelectionPolicy` so the option group selection-range rule is owned by a domain policy instead of the controller or adapter.
- Kept the option group create write transaction owned by the use case through `MikroOrmUnitOfWork`, with the repository using only the provided transaction context.
- Preserved legacy create behavior for product lookup, `minSelections`/`maxSelections` defaulting, the existing invalid-range message when both bounds are provided, default `sortOrder` from current option-group count, explicit `sortOrder: 0`, one flush for created option groups, and no flush for missing products.
- Reused the existing Swagger-visible `AdminProductOptionGroupResponseDto` and mapper for the create route response.
- Cleaned `CreateOptionGroupDto` for the Swagger/OOP rules: explicit public readonly fields, JSDoc descriptions, no definite assignment assertions, and no manual `@Api*` decorators.
- Removed `AdminService.createOptionGroup()` while leaving option group update/delete/reorder, group option mutations, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request body shape, response key shape, option group update/delete/reorder, group option mutations, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused option-group create tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/admin-option-group-selection.policy.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 24 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/admin-option-group-selection.policy.test.ts test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 81 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 242 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new option-group domain/application files, option-group write adapter, admin controller/module/DTO files, and option-group tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller, `CreateOptionGroupDto`, and product response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- DTO validation probe for `CreateOptionGroupDto` returned `ok` for a valid name and numeric selection bounds.
- Stale-reference scans confirmed `AdminService.createOptionGroup()` and `adminService.createOptionGroup` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/products/:productId/option-groups` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/admin/products/00000000-0000-4000-8000-000000000000/option-groups` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `CreateAdminOptionGroupUseCase` owns the write transaction boundary and passes the transaction context to the repository port.
- `AdminOptionGroupSelectionPolicy` owns the min/max create validation and intentionally preserves the legacy create behavior where a single supplied bound is defaulted without comparing against the other defaulted bound.
- `MikroOrmAdminOptionGroupWriteRepository` is the only touched option-group create file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy creation semantics: missing products return a typed outcome without flushing, default `sortOrder` uses the current option-group count, and successful creates return an empty options array.
- The controller route path and guard stayed stable, and the controller maps the HTTP DTO into an application command instead of sending DTOs or ORM entities into application code.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, DTO validation, stale-reference scans, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated option-group create against local data to avoid inserting local option groups during the refactor loop; policy/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The create policy preserves a legacy edge case where providing only `minSelections` can result in `minSelections > default maxSelections`; tightening that would be a behavior change and should be handled deliberately if desired.
- `AdminService` still contains legacy option group update/delete/reorder, group option mutations, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is option group update behind the same option-group write port/use case, then option group delete/reorder as separate small write slices.

### 2026-05-07 - Phase 8 - Admin option group update use-case slice

Status: Done

Changed:
- Moved `PUT /api/admin/option-groups/:id` off `AdminService.updateOptionGroup()` and onto `UpdateAdminOptionGroupUseCase`.
- Extended `AdminOptionGroupWriteRepository` with `update(id, data, context)` and typed outcomes for updated, missing option group, and invalid selection range.
- Updated `MikroOrmAdminOptionGroupWriteRepository` to update option groups through the provided transaction context, preserve legacy partial field behavior, validate effective min/max bounds before mutation, flush once on success, and avoid flushing for missing or invalid option groups.
- Extended `AdminOptionGroupSelectionPolicy` with update-time effective selection validation so the min/max rule remains in the domain policy instead of the controller or use case.
- Added `AdminOptionGroupNotFoundError` and kept HTTP translation in `AdminController` as the existing `404` message `Option group not found`.
- Updated `AdminController` and `AdminModule` so the update route maps the HTTP DTO into an application command and returns `AdminProductOptionGroupResponseDto`.
- Cleaned `UpdateOptionGroupDto` for the Swagger/OOP rules: explicit public readonly fields, JSDoc descriptions, and no manual `@Api*` decorators.
- Removed `AdminService.updateOptionGroup()` while leaving option group delete/reorder, group option mutations, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request body shape, option group delete/reorder, group option mutations, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused option-group tests before self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/admin-option-group-selection.policy.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/update-admin-option-group.use-case.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/modules/admin/admin-product.mapper.test.ts` - 27 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/update-admin-option-group.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 85 tests passed.
- Self-review fix rerun of the focused option-group test command - 27 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 251 tests passed before and after the self-review fix.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new option-group application files, option-group domain policy, write adapter, admin controller/module/DTO files, and option-group tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller, `CreateOptionGroupDto`, `UpdateOptionGroupDto`, and product response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- DTO validation probe for `UpdateOptionGroupDto` returned `ok` for a valid name, numeric selection bounds, explicit `sortOrder: 0`, and `isActive: false`.
- Stale-reference scans confirmed `AdminService.updateOptionGroup()` and `adminService.updateOptionGroup` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/option-groups/:id` `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PUT /api/admin/option-groups/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `UpdateAdminOptionGroupUseCase` owns the write transaction boundary and passes the transaction context to the repository port.
- `AdminOptionGroupSelectionPolicy` now handles update-time effective min/max validation, matching the legacy update behavior where omitted bounds are read from current state and then defaulted before comparison.
- `MikroOrmAdminOptionGroupWriteRepository` remains the only touched option-group update file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy update semantics: omitted fields are left unchanged, explicit `sortOrder: 0` and `isActive: false` are honored, missing option groups do not flush, and invalid min/max updates do not flush.
- The controller route path and guard stayed stable, and the controller maps the HTTP DTO into an application command instead of sending DTOs or ORM entities into application code.
- Self-review found a readability issue in the adapter's inline union return type; it was replaced with a named local `UpdateSelectionResult`, then focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scan, and Swagger scan were rerun.

Risks:
- This slice did not execute an authenticated option-group update against local data to avoid mutating local option groups during the refactor loop; policy/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The moved update route now returns an explicit DTO instead of a raw MikroORM entity, which is intentional for Swagger and adapter boundaries; the admin UI generally refetches admin product details after mutations.
- `AdminService` still contains legacy option group delete/reorder, group option mutations, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is option group delete behind the same option-group write port/use case, then option group reorder as a separate small write slice.

### 2026-05-07 - Phase 8 - Admin option group delete use-case slice

Status: Done

Changed:
- Moved `DELETE /api/admin/option-groups/:id` off `AdminService.deleteOptionGroup()` and onto `DeleteAdminOptionGroupUseCase`.
- Extended `AdminOptionGroupWriteRepository` with `softDelete(id, context)`.
- Updated `MikroOrmAdminOptionGroupWriteRepository` to soft-delete option groups through the provided transaction context by setting `isActive = false`.
- Kept the existing delete behavior: one flush for found option groups, no flush for missing option groups, `{ success: true }` response for successful deletes, and the existing `404` message `Option group not found`.
- Added Swagger-visible `DeleteOptionGroupResponseDto` for the moved route response.
- Updated `AdminController` and `AdminModule` so the delete route maps through the application use case and no longer calls the legacy admin service.
- Removed `AdminService.deleteOptionGroup()` while leaving option group reorder, group option mutations, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, response body shape, option group reorder, group option mutations, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused option-group delete tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/admin-option-group-selection.policy.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/update-admin-option-group.use-case.test.ts test/contexts/admin/delete-admin-option-group.use-case.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/modules/admin/admin-product.mapper.test.ts` - 31 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/update-admin-option-group.use-case.test.ts test/contexts/admin/delete-admin-option-group.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 89 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 255 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the option-group domain/application files, option-group write adapter, admin controller/module/DTO files, and option-group tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller, `CreateOptionGroupDto`, `UpdateOptionGroupDto`, `DeleteOptionGroupResponseDto`, and product response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `DeleteOptionGroupResponseDto` returned `ok`.
- Stale-reference scans confirmed `AdminService.deleteOptionGroup()` and `adminService.deleteOptionGroup` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/option-groups/:id` `DELETE`.
- `pnpm smoke:api`
- Local unauthenticated route check for `DELETE /api/admin/option-groups/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `DeleteAdminOptionGroupUseCase` is a thin orchestrator: it opens the transaction, asks the write port to soft-delete the option group, translates a missing option group into an application error, and returns the stable success result.
- `MikroOrmAdminOptionGroupWriteRepository` remains the only touched delete file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy soft-delete behavior and avoids flushing when the option group is missing.
- The controller route path and guard stayed stable, and the controller returns an explicit response DTO instead of raw object literals from the legacy service.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, response DTO probe, stale-reference scans, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated option-group delete against local data to avoid mutating local option groups during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- `AdminService` still contains legacy option group reorder, group option mutations, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is option group reorder behind the same option-group write port/use case, then group option mutations as separate small write slices.

### 2026-05-07 - Phase 8 - Admin option group reorder use-case slice

Status: Done

Changed:
- Moved `PATCH /api/admin/option-groups/reorder` off `AdminService.reorderOptionGroups()` and onto `ReorderAdminOptionGroupsUseCase`.
- Extended `AdminOptionGroupWriteRepository` with `reorder(items, context)`.
- Updated `MikroOrmAdminOptionGroupWriteRepository` so option group reorder persistence uses the use-case-owned transaction context.
- Preserved legacy reorder behavior: missing option group ids are skipped, found groups receive the provided `sortOrder`, and one flush happens after the loop.
- Added Swagger-visible `ReorderOptionGroupsResponseDto` for the moved route response.
- Updated `AdminController` and `AdminModule` so the reorder route maps the existing `ReorderDto` into an application command and no longer calls the legacy admin service.
- Removed `AdminService.reorderOptionGroups()` while leaving group option mutations, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request body shape, response body shape, group option create/update/delete/reorder, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused option-group tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/admin-option-group-selection.policy.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/update-admin-option-group.use-case.test.ts test/contexts/admin/delete-admin-option-group.use-case.test.ts test/contexts/admin/reorder-admin-option-groups.use-case.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/modules/admin/admin-product.mapper.test.ts` - 33 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/update-admin-option-group.use-case.test.ts test/contexts/admin/delete-admin-option-group.use-case.test.ts test/contexts/admin/reorder-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 91 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 257 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the option-group domain/application files, option-group write adapter, admin controller/module/DTO files, and option-group tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller, `ReorderDto`, option-group DTOs, reorder response DTO, and product response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `ReorderOptionGroupsResponseDto` returned `ok`.
- Stale-reference scans confirmed `AdminService.reorderOptionGroups()` and `adminService.reorderOptionGroups` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/option-groups/reorder` `PATCH`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PATCH /api/admin/option-groups/reorder` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `ReorderAdminOptionGroupsUseCase` is a thin orchestrator: it opens the transaction, asks the write port to reorder option groups, and returns the stable success result.
- `MikroOrmAdminOptionGroupWriteRepository` remains the only touched option-group reorder file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy reorder behavior and skips missing ids without failing the whole request.
- The controller route path and guard stayed stable, and the controller maps the HTTP DTO into an application command instead of sending DTOs or ORM entities into application code.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, response DTO probe, stale-reference scans, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated option-group reorder against local data to avoid mutating local option group order during the refactor loop; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- `AdminService` still contains legacy group option create/update/delete/reorder, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is group option create behind a dedicated product-extra/option-group write port/use case, then group option update/delete/reorder as separate small write slices.

### 2026-05-07 - Phase 8 - Admin group option create use-case slice

Status: Done

Changed:
- Moved `POST /api/admin/option-groups/:groupId/options` off `AdminService.createGroupOption()` and onto `CreateAdminGroupOptionUseCase`.
- Extended `AdminProductExtraWriteRepository` with `createForOptionGroup(groupId, data, context)` because group options are persisted as `ProductExtra` rows attached to an `OptionGroup`.
- Updated `MikroOrmAdminProductExtraWriteRepository` to load the option group with its product/options, create the option inside the use-case-owned transaction context, preserve `sortOrder` from the current option count, flush once on success, and avoid flushing when the option group is missing.
- Reused `AdminOptionGroupNotFoundError` for application-layer missing group translation and kept the HTTP `404` message as `Option group not found`.
- Added `toAdminGroupOptionResponseDto()` so the moved create route preserves the legacy numeric `price` response for newly created group options.
- Updated `AdminController` and `AdminModule` so the group option create route maps `CreateExtraDto` into an application command and no longer calls the legacy admin service.
- Removed `AdminService.createGroupOption()` while leaving group option update/delete/reorder, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request body shape, numeric price response behavior, group option update/delete/reorder, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused product-extra/group-option tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/create-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 24 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/update-admin-option-group.use-case.test.ts test/contexts/admin/delete-admin-option-group.use-case.test.ts test/contexts/admin/reorder-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/create-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 96 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 262 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the product-extra/group-option application files, product-extra write adapter, admin controller/module/mapper/DTO files, and product-extra/group-option tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller, `CreateExtraDto`, and product response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response mapper probe for `toAdminGroupOptionResponseDto()` returned `ok` and confirmed the legacy numeric `price` output.
- Stale-reference scans confirmed `AdminService.createGroupOption()` and `adminService.createGroupOption` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/option-groups/:groupId/options` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/admin/option-groups/00000000-0000-4000-8000-000000000000/options` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `CreateAdminGroupOptionUseCase` is a thin orchestrator: it opens the transaction, asks the write port to create the option for an option group, translates a missing option group into an application error, and returns the mutation model.
- `MikroOrmAdminProductExtraWriteRepository` remains the only touched group-option create file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy create behavior: it derives the option product from the option group, stores `price.toFixed(2)`, uses current option count for `sortOrder`, and does not flush when the group is missing.
- The controller route path and guard stayed stable, and the controller maps the HTTP DTO into an application command instead of sending DTOs or ORM entities into application code.
- Self-review identified the legacy route's numeric `price` response; the slice preserves that through a dedicated adapter mapper and focused mapper test. Focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, response mapper probe, stale-reference scans, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated group option create against local data to avoid inserting local options during the refactor loop; use-case/adapter/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- `AdminService` still contains legacy group option update/delete/reorder, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is group option update behind the same product-extra write port/use case, preserving the current raw-option response behavior deliberately or replacing it with an explicit DTO only if the response contract is verified.

### 2026-05-07 - Phase 8 - Admin group option update use-case slice

Status: Done

Changed:
- Moved `PUT /api/admin/option-group-options/:id` off `AdminService.updateGroupOption()` and onto `UpdateAdminGroupOptionUseCase`.
- Reused the existing `AdminProductExtraWriteRepository.update(id, data, context)` port because group options are persisted as `ProductExtra` rows and the legacy update behavior matches product-extra mutation semantics.
- Added `AdminGroupOptionNotFoundError` for application-layer missing option translation while preserving the existing HTTP `404` message `Option not found`.
- Added Swagger-visible `AdminGroupOptionMutationResponseDto` for the moved update route response.
- Added `toAdminGroupOptionMutationResponseDto()` so the moved update route preserves the legacy updated-option `price` as a persisted decimal string, while the create group-option route continues to preserve its legacy numeric `price` response.
- Updated `AdminController` and `AdminModule` so the group option update route maps `UpdateExtraDto` into an application command and no longer calls the legacy admin service.
- Removed `AdminService.updateGroupOption()` while leaving group option delete/reorder, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, request body shape, string price update response behavior, product-extra port/adapter behavior, group option delete/reorder, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused product-extra/group-option tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 26 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/update-admin-option-group.use-case.test.ts test/contexts/admin/delete-admin-option-group.use-case.test.ts test/contexts/admin/reorder-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/create-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 100 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 266 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new group-option application file, product-extra error file, admin controller/module/mapper/DTO files, and group-option tests returned no `any`, non-null assertions, or definite assignment assertions.
- Diff-level strictness scan over the touched `AdminService` update-group-option removal returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller, `UpdateExtraDto`, `AdminGroupOptionMutationResponseDto`, product response DTO, and product-extra mutation response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `toAdminGroupOptionMutationResponseDto()` returned `ok` and confirmed the legacy string `price` output.
- Stale-reference scans confirmed `AdminService.updateGroupOption()` and `adminService.updateGroupOption` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/option-group-options/:id` `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PUT /api/admin/option-group-options/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `UpdateAdminGroupOptionUseCase` is a thin orchestrator: it opens the transaction, asks the existing product-extra write port to update the persisted option row, translates a missing row into a group-option application error, and returns the mutation model.
- Reusing `AdminProductExtraWriteRepository.update()` avoids adding a duplicate persistence method and preserves legacy behavior: partial updates skip undefined fields, `price` is stored with `toFixed(2)`, successful updates flush once, and missing options do not flush.
- The controller route path and guard stayed stable, and the controller maps the HTTP DTO into an application command instead of sending DTOs or ORM entities into application code.
- Self-review preserved the legacy asymmetry where group option create returns numeric `price` but update returns the persisted decimal string. Focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, response DTO probe, stale-reference scans, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated group option update against local data to avoid mutating local options during the refactor loop; use-case/repository/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The update use case intentionally preserves legacy behavior and does not verify that the `ProductExtra` row belongs to an option group; tightening that would be a behavior change and should be handled deliberately if desired.
- `AdminService` still contains legacy group option delete/reorder, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is group option delete behind the same product-extra write port/use case, then group option reorder as a separate small write slice.

### 2026-05-07 - Phase 8 - Admin group option delete use-case slice

Status: Done

Changed:
- Moved `DELETE /api/admin/option-group-options/:id` off `AdminService.deleteGroupOption()` and onto `DeleteAdminGroupOptionUseCase`.
- Reused the existing `AdminProductExtraWriteRepository.softDelete(id, context)` port because group options are persisted as `ProductExtra` rows and legacy delete behavior matches product-extra soft-delete semantics.
- Reused `AdminGroupOptionNotFoundError` for application-layer missing option translation while preserving the existing HTTP `404` message `Option not found`.
- Added Swagger-visible `DeleteGroupOptionResponseDto` for the moved delete route response.
- Updated `AdminController` and `AdminModule` so the group option delete route maps through the application use case and no longer calls the legacy admin service.
- Removed `AdminService.deleteGroupOption()` while leaving group option reorder, dashboard, and order-history behavior in the legacy admin service for later slices.
- Kept route path, guard, response body shape, product-extra port/adapter behavior, group option reorder, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused product-extra/group-option tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-group-option.use-case.test.ts test/contexts/admin/delete-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 28 tests passed.
- Focused admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-categories.use-case.test.ts test/contexts/admin/list-admin-products.use-case.test.ts test/contexts/admin/list-admin-featured-products.use-case.test.ts test/contexts/admin/list-admin-product-extras.use-case.test.ts test/contexts/admin/list-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-option-group.use-case.test.ts test/contexts/admin/update-admin-option-group.use-case.test.ts test/contexts/admin/delete-admin-option-group.use-case.test.ts test/contexts/admin/reorder-admin-option-groups.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/create-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-group-option.use-case.test.ts test/contexts/admin/delete-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/reorder-admin-products.use-case.test.ts test/contexts/admin/delete-admin-product.use-case.test.ts test/contexts/admin/toggle-admin-product.use-case.test.ts test/contexts/admin/set-admin-featured-products.use-case.test.ts test/contexts/admin/create-admin-product.use-case.test.ts test/contexts/admin/update-admin-product.use-case.test.ts test/contexts/admin/mikro-orm-admin-category.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product.read-repository.test.ts test/contexts/admin/mikro-orm-admin-product-write.repository.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/contexts/admin/mikro-orm-admin-option-group-write.repository.test.ts test/modules/admin/admin-category.mapper.test.ts test/modules/admin/admin-product.mapper.test.ts test/contexts/admin/reorder-admin-categories.use-case.test.ts test/contexts/admin/delete-admin-category.use-case.test.ts test/contexts/admin/update-admin-category.use-case.test.ts test/contexts/admin/create-admin-category.use-case.test.ts test/contexts/admin/mikro-orm-admin-category-write.repository.test.ts` - 102 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 268 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new group-option delete application file, delete response DTO, admin controller/module files, and group-option delete test returned no `any`, non-null assertions, or definite assignment assertions.
- Diff-level strictness scan over the touched `AdminService` delete-group-option removal returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller, `DeleteGroupOptionResponseDto`, and delete-extra response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `DeleteGroupOptionResponseDto` returned `ok`.
- Stale-reference scans confirmed `AdminService.deleteGroupOption()` and `adminService.deleteGroupOption` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/option-group-options/:id` `DELETE`.
- `pnpm smoke:api`
- Local unauthenticated route check for `DELETE /api/admin/option-group-options/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server.

Self-review:
- `DeleteAdminGroupOptionUseCase` is a thin orchestrator: it opens the transaction, asks the existing product-extra write port to soft-delete the persisted option row, translates a missing row into a group-option application error, and returns the stable success result.
- Reusing `AdminProductExtraWriteRepository.softDelete()` avoids adding a duplicate persistence method and preserves legacy behavior: found options are marked inactive and flushed once, missing options do not flush, and successful deletes return `{ success: true }`.
- The controller route path and guard stayed stable, and the controller returns an explicit response DTO instead of a raw object literal from the legacy service.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, response DTO probe, stale-reference scans, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated group option delete against local data to avoid mutating local options during the refactor loop; use-case/repository behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The delete use case intentionally preserves legacy behavior and does not verify that the `ProductExtra` row belongs to an option group; tightening that would be a behavior change and should be handled deliberately if desired.
- `AdminService` still contains legacy group option reorder, dashboard, and order-history behavior.
- A broad scan of untouched legacy `AdminService` still reports existing `any` and non-null assertions in dashboard/order-history code; those remain outside this slice and tracked for later Phase 8 cleanup.
- Next recommended slice is group option reorder behind the same product-extra write port/use case.

### 2026-05-07 - Phase 8 - Admin group option reorder use-case slice

Status: Done

Changed:
- Moved `PATCH /api/admin/option-group-options/reorder` off `AdminService.reorderGroupOptions()` and onto `ReorderAdminGroupOptionsUseCase`.
- Extended `AdminProductExtraWriteRepository` with `reorder(items, context)` because group options are persisted as `ProductExtra` rows.
- Updated `MikroOrmAdminProductExtraWriteRepository` so group option reorder persistence uses the use-case-owned transaction context.
- Preserved legacy reorder behavior: missing option ids are skipped, found options receive the provided `sortOrder`, and one flush happens after the loop.
- Added Swagger-visible `ReorderGroupOptionsResponseDto` for the moved route response.
- Updated `AdminController` and `AdminModule` so the reorder route maps the existing `ReorderDto` into an application command and no longer calls the legacy admin service.
- Removed `AdminService.reorderGroupOptions()`; `AdminService` now only contains legacy dashboard, active order list, and order-history behavior.
- Kept route path, guard, request body shape, response body shape, dashboard/order-history behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused product-extra/group-option tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-group-option.use-case.test.ts test/contexts/admin/update-admin-group-option.use-case.test.ts test/contexts/admin/delete-admin-group-option.use-case.test.ts test/contexts/admin/reorder-admin-group-options.use-case.test.ts test/contexts/admin/create-admin-product-extra.use-case.test.ts test/contexts/admin/update-admin-product-extra.use-case.test.ts test/contexts/admin/delete-admin-product-extra.use-case.test.ts test/contexts/admin/mikro-orm-admin-product-extra-write.repository.test.ts test/modules/admin/admin-product.mapper.test.ts` - 32 tests passed.
- Admin context suite from `apps/api`: `pnpm exec node --test -r ts-node/register test/contexts/admin/*.test.ts test/modules/admin/*.test.ts` - 109 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 270 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new reorder application file, product-extra write port/adapter, response DTO, admin controller/module files, and touched admin tests returned no `any`, non-null assertions, or definite assignment assertions.
- Diff-level strictness scan over the touched `AdminService` reorder-group-options removal returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller, `ReorderDto`, and `ReorderGroupOptionsResponseDto` returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `ReorderGroupOptionsResponseDto` returned `ok`.
- Stale-reference scans confirmed `AdminService.reorderGroupOptions()` and `adminService.reorderGroupOptions` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/option-group-options/reorder` `PATCH`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PATCH /api/admin/option-group-options/reorder` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local data.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `ReorderAdminGroupOptionsUseCase` is a thin orchestrator: it opens the transaction, asks the existing product-extra write port to reorder persisted option rows, and returns the stable success result.
- `MikroOrmAdminProductExtraWriteRepository` remains the only touched reorder file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy reorder behavior and skips missing ids without failing the whole request.
- The controller route path and guard stayed stable, and the controller maps the HTTP DTO into an application command instead of sending DTOs or ORM entities into application code.
- Self-review found incomplete fake repository implementations after the port extension and a formatting issue in the adapter test; those were fixed before the full verification gate was rerun.

Risks:
- This slice did not execute an authenticated group option reorder against local data to avoid mutating local option order during the refactor loop; use-case/repository behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The reorder use case intentionally preserves legacy behavior and does not verify that the `ProductExtra` rows belong to option groups; tightening that would be a behavior change and should be handled deliberately if desired.
- `AdminService` still contains legacy dashboard, active order list, and order-history behavior, including known old `any` and non-null assertions outside this slice.
- Phase 8 admin category/product/extra/option-group/group-option mutations are now migrated; next recommended slice is admin dashboard or admin order read models behind performance-preserving read ports/use cases.

### 2026-05-07 - Phase 8 - Admin active orders read use-case slice

Status: Done

Changed:
- Moved `GET /api/admin/orders` off `AdminService.listOrders()` and onto `ListAdminOrdersUseCase`.
- Added `AdminOrderReadModel`, `AdminOrderReadRepository`, and `MikroOrmAdminOrderReadRepository` for the admin active-orders read path.
- Preserved the legacy active-orders query shape: with an explicit `status`, query only that status; without `status`, query orders whose status is in the active set or whose `createdAt` is greater than or equal to local start of today.
- Preserved the legacy persistence options: `populate: ['items']`, `orderBy: { createdAt: 'DESC' }`, and `limit: 200`.
- Added Swagger-visible `AdminOrderResponseDto` plus nested item/extra DTOs, with JSDoc descriptions and no manual `@Api*` decorators.
- Added `toAdminOrderResponseDto()` so the controller maps the application read model into the adapter response contract.
- Updated `AdminController` and `AdminModule` so the active-orders route uses the application use case and repository token.
- Removed `AdminService.listOrders()`; `AdminService` now only contains legacy dashboard and order-history behavior.
- Kept route path, guard, query parameter shape, active status set, legacy date-window semantics, order-history/dashboard behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused active-orders tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-orders.use-case.test.ts test/contexts/admin/mikro-orm-admin-order.read-repository.test.ts test/modules/admin/admin-order.mapper.test.ts` - 6 tests passed.
- Admin context suite from `apps/api`: `pnpm exec node --test -r ts-node/register test/contexts/admin/*.test.ts test/modules/admin/*.test.ts` - 115 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 276 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new active-orders application files, read adapter, response DTO, mapper, admin controller/module files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Addition-only strictness scan over the touched `AdminService` active-orders removal returned no new `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and `AdminOrderResponseDto` returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `AdminOrderResponseDto` returned `ok`.
- Stale-reference scans confirmed `AdminService.listOrders()` and `adminService.listOrders` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/orders` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/orders` returned `401` and `{"message":"Unauthorized","statusCode":401}` without exposing admin order data.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `ListAdminOrdersUseCase` is a thin orchestrator: it decides whether the request is a status-filtered list or the default active/today window, asks the read repository for data, and returns read models.
- `MikroOrmAdminOrderReadRepository` is the only touched active-orders read file that imports MikroORM or ORM entities.
- The adapter preserves legacy response shaping: decimal strings become numbers, missing delivery type defaults to `pickup`, missing grouped extras become `null`, and item counts come from populated order items.
- The controller route path and guard stayed stable, and the controller maps the read model into explicit response DTOs instead of returning raw objects from the legacy service.
- Self-review found one timezone-sensitive test expectation for local start of day; that expectation was corrected before the full verification gate was rerun.

Risks:
- This slice did not execute an authenticated active-orders request against local data to avoid exposing admin data in the verification transcript; use-case/repository/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The active-orders read model intentionally preserves legacy `status` and `paymentStatus` optionality from the ORM entity shape instead of tightening the response contract in this slice.
- `AdminService` still contains legacy dashboard and order-history behavior, including known old `any` and non-null assertions outside this slice.
- Next recommended slice is `GET /api/admin/orders/history` behind a paginated admin order-history read model/use case, then dashboard as the remaining admin read surface.

### 2026-05-07 - Phase 8 - Admin order history read use-case slice

Status: Done

Changed:
- Moved `GET /api/admin/orders/history` off `AdminService.listOrdersHistory()` and onto `ListAdminOrderHistoryUseCase`.
- Extended `AdminOrderReadRepository` with `listHistory(query)` and reused `MikroOrmAdminOrderReadRepository` for active and history admin order reads.
- Added `AdminOrderHistoryPageReadModel`, `AdminOrderHistoryOrderReadModel`, and `AdminOrderDeliveryAddressReadModel` for the paginated history response.
- Preserved the legacy history query shape: status filter, `from` lower bound, `to` expanded to end of day, exact numeric search by `orderNumber`, and nonnumeric search by customer-name `$ilike`.
- Preserved the legacy persistence options: `findAndCount`, `populate: ['items']`, `orderBy: { createdAt: 'DESC' }`, `limit`, and `offset: (page - 1) * limit`.
- Preserved legacy pagination behavior: default page `1`, default limit `20`, and limit cap `100`.
- Added Swagger-visible `ListAdminOrderHistoryQueryDto`, `AdminOrderHistoryResponseDto`, nested history order DTO, and delivery address DTO.
- Added `toAdminOrderHistoryResponseDto()` so the controller maps the application read model into the adapter response contract while reusing the active order item response DTO mapping.
- Updated `AdminController` and `AdminModule` so the history route uses the application use case and no longer calls the legacy admin service.
- Removed `AdminService.listOrdersHistory()`; `AdminService` now only contains legacy dashboard behavior.
- Kept route path, guard, query parameter names, history payload shape, dashboard behavior, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused history/order tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-orders.use-case.test.ts test/contexts/admin/list-admin-order-history.use-case.test.ts test/contexts/admin/mikro-orm-admin-order.read-repository.test.ts test/modules/admin/admin-order.mapper.test.ts test/modules/admin/admin-order-history.mapper.test.ts` - 11 tests passed after one expectation fix.
- Focused post-review rerun: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-order-history.use-case.test.ts test/contexts/admin/mikro-orm-admin-order.read-repository.test.ts test/modules/admin/admin-order-history.mapper.test.ts` - 8 tests passed.
- Admin context suite from `apps/api`: `pnpm exec node --test -r ts-node/register test/contexts/admin/*.test.ts test/modules/admin/*.test.ts` - 120 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 281 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new history application files, read adapter, response/query DTOs, mapper, admin controller/module files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Addition-only strictness scan over the touched `AdminService` history removal returned no new `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller, `ListAdminOrderHistoryQueryDto`, and `AdminOrderHistoryResponseDto` returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO/query DTO probe returned `ok` when run with `node -r reflect-metadata`.
- Stale-reference scan confirmed `adminService.listOrdersHistory` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/orders/history` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/orders/history?page=1&limit=20` returned `401` and `{"message":"Unauthorized","statusCode":401}` without exposing admin order data.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `ListAdminOrderHistoryUseCase` is a thin orchestrator: it applies the legacy pagination defaults/cap, asks the read repository for the page, and returns the read model.
- `MikroOrmAdminOrderReadRepository` remains the only touched history read file that imports MikroORM or ORM entities.
- The adapter preserves legacy filtering, pagination, date expansion, search semantics, decimal conversion, delivery address response data, item count, and item snapshot mapping.
- The controller route path and guard stayed stable, and the controller maps query DTO fields into an application command instead of sending the DTO instance into application code.
- Self-review found a harmless focused-test expectation mismatch around explicit `undefined` optional filters and a readability issue in the new use case; both were fixed before rerunning focused verification and typecheck.

Risks:
- This slice did not execute an authenticated order-history request against local data to avoid exposing admin data in the verification transcript; use-case/repository/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The query DTO adds class-validator numeric validation for `page` and `limit`; valid-client behavior is preserved, but malformed numeric query strings may now fail validation earlier than the legacy primitive query parameters.
- `AdminService` still contains legacy dashboard behavior, including known old `any` and non-null assertions outside this slice.
- Next recommended slice is `GET /api/admin/dashboard` behind a performance-preserving dashboard read model/use case, then the remaining Phase 8 cleanup around admin routes still outside this controller/service cluster.

### 2026-05-07 - Phase 8 - Admin dashboard read use-case slice

Status: Done

Changed:
- Moved `GET /api/admin/dashboard` off `AdminService.getDashboard()` and onto `GetAdminDashboardUseCase`.
- Added `AdminDashboardReadModel`, `AdminDashboardReadRepository`, and `MikroOrmAdminDashboardReadRepository` for the dashboard read path.
- Preserved the legacy dashboard query shape: one populated today-orders query and one weekly revenue query per day in the seven-day window.
- Preserved the legacy paid-status set: `paid`, `preparing`, `ready`, `out_for_delivery`, and `delivered`.
- Preserved the legacy dashboard payload keys: `todayOrdersCount`, `todayPaidCount`, `todayRevenue`, `avgTicket`, `ordersByStatus`, `revenueByHour`, `topProducts`, `byPayment`, and `weeklyRevenue`.
- Preserved the legacy aggregation behavior: revenue rounded through cents, revenue-by-hour buckets include hours `6` through `23`, top products roll up by product name, and weekly revenue uses date labels derived from the local day start.
- Added Swagger-visible `AdminDashboardResponseDto` plus nested dashboard DTOs.
- Added `toAdminDashboardResponseDto()` so the controller maps the application read model into the adapter response contract.
- Updated `AdminController` and `AdminModule` so the dashboard route uses the application use case and dashboard read repository token.
- Removed the now-unused legacy `AdminService` file and provider from the admin module.
- Kept route path, guard, response body shape, dashboard query-count shape, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused dashboard tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/get-admin-dashboard.use-case.test.ts test/contexts/admin/mikro-orm-admin-dashboard.read-repository.test.ts test/modules/admin/admin-dashboard.mapper.test.ts` - 3 tests passed after fixing test-only issues.
- Focused post-review rerun: same focused dashboard command - 3 tests passed.
- Admin context suite from `apps/api`: `pnpm exec node --test -r ts-node/register test/contexts/admin/*.test.ts test/modules/admin/*.test.ts` - 123 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 284 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new dashboard application files, read adapter, response DTO, mapper, admin controller/module files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and `AdminDashboardResponseDto` returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `AdminDashboardResponseDto` returned `ok`.
- Stale-reference scan confirmed `AdminService` and `adminService` references are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/dashboard` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/dashboard` returned `401` and `{"message":"Unauthorized","statusCode":401}` without exposing admin dashboard data.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `GetAdminDashboardUseCase` is a thin orchestrator: it computes local start-of-day and the seven-day read window with a clock, passes the paid-status set, and returns the read model from the repository.
- `MikroOrmAdminDashboardReadRepository` is the only touched dashboard read file that imports MikroORM or ORM entities.
- The adapter preserves the legacy calculations while removing old `any` and non-null assertions from the moved dashboard path.
- The controller route path and guard stayed stable, and the controller returns an explicit response DTO instead of returning the legacy service object directly.
- Removing `AdminService` was safe within this slice because `AdminService` and `adminService` had no remaining references after moving the dashboard route.
- Self-review found test-only issues in the first focused run and a readability issue in the dashboard adapter; those were fixed before rerunning focused verification, typecheck, build, and fresh boot.

Risks:
- This slice did not execute an authenticated dashboard request against local data to avoid exposing admin data in the verification transcript; use-case/repository/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The dashboard remains a read-model calculation over ORM entities, preserving the legacy query count rather than optimizing to fewer database-side aggregate queries in this slice.
- `AdminDashboardResponseDto` preserves map-shaped fields with `Record<string, number>` for `ordersByStatus` and `byPayment` because changing them to arrays would change the existing API payload.
- `AdminController` still contains legacy-adjacent `customers`, `loyalty/adjust`, and `upload` routes. Customer and loyalty behavior belongs to Phase 9, while upload is an adapter utility route.
- Next recommended slice is to re-read the plan and inspect remaining unchecked Phase 8 admin surfaces outside `AdminController` before moving to Phase 9.

### 2026-05-07 - Phase 8 - Admin sections read use-case slice

Status: Done

Changed:
- Moved `GET /api/admin/sections` off `SectionsService.listAll()` and onto `ListAdminSectionsUseCase`.
- Added `AdminSectionReadModel`, `AdminSectionReadRepository`, and `MikroOrmAdminSectionReadRepository` for the admin sections read path.
- Preserved the legacy sections query shape: `em.find(Section, {}, { populate: ['products.product'], orderBy: { sortOrder: 'ASC' } })`.
- Preserved the legacy admin section response fields: `id`, `label`, `emoji`, `sortOrder`, `isActive`, `availabilitySchedule`, `productCount`, and sorted `products`.
- Added Swagger-visible admin section response DTO classes and `toAdminSectionResponseDto()` mapper.
- Updated `SectionsAdminController` and `SectionsModule` so the admin sections list route uses the application use case and read repository token.
- Removed the now-unused `SectionsService.listAll()` method while leaving section create/update/delete/reorder/set-products behavior in the legacy service for later slices.
- Kept route path, guard, mutation behavior, public sections behavior, delivery areas, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused section tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/list-admin-sections.use-case.test.ts test/contexts/admin/mikro-orm-admin-section.read-repository.test.ts test/modules/sections/section.mapper.test.ts` - 4 tests passed before and after the self-review cleanup.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` first hit a transient Node/V8 native crash in unrelated `reorder-admin-group-options.use-case.test.ts` after 287 passing tests; immediate rerun passed all 288 tests.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new section application files, read adapter, response DTO, mapper, section controller/module/service files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched section controller and `AdminSectionResponseDto` returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `AdminSectionResponseDto` returned `ok`.
- Stale-reference scan confirmed `SectionsService.listAll()` and `service.listAll` references are gone outside the controller route method name.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/sections` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/sections` returned `401` and `{"message":"Unauthorized","statusCode":401}` without exposing admin section data.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `ListAdminSectionsUseCase` is a thin orchestrator and depends only on an application read repository port.
- `MikroOrmAdminSectionReadRepository` is the only new section read file that imports MikroORM or ORM entities.
- The adapter preserves legacy section list sorting, product sorting, product price parsing, defaulted `sortOrder`/`isActive`, and `availabilitySchedule` null behavior.
- The controller route path and guard stayed stable, and the controller maps the read model into explicit response DTOs instead of returning legacy service objects.
- Self-review found the old `SectionsService.listAll()` was dead after the route moved; it was removed and focused tests plus API typecheck were rerun.

Risks:
- This slice did not execute an authenticated admin sections request against local data to avoid exposing admin data in the verification transcript; use-case/repository/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- Section mutation routes still call `SectionsService`; those write flows still need use-case-owned transaction boundaries.
- `SectionsService.listPublic()` appears legacy-adjacent because the public route already uses `GetPublicSectionsUseCase`; removing it belongs in a cleanup slice after confirming no hidden callers.
- Next recommended slice is `POST /api/admin/sections` behind a section write repository/use case, preserving current `sortOrder = count(Section)` and weekly schedule normalization behavior.

### 2026-05-07 - Phase 8 - Admin section create use-case slice

Status: Done

Changed:
- Moved `POST /api/admin/sections` off `SectionsService.create()` and onto `CreateAdminSectionUseCase`.
- Added `AdminSectionWriteRepository`, `CreateAdminSectionData`, `AdminSectionMutationModel`, and `MikroOrmAdminSectionWriteRepository`.
- Preserved the legacy create behavior: new section `sortOrder` comes from `count(Section, {})`, missing `emoji` becomes `''`, and `availabilitySchedule` is normalized before persistence.
- Kept the section create write transaction owned by the use case through `MikroOrmUnitOfWork`.
- Reused `AdminSectionResponseDto` and `toAdminSectionResponseDto()` so the moved route returns an explicit Swagger-visible response DTO.
- Updated `SectionsAdminController.create` to map the HTTP DTO into an application command instead of sending the DTO to a service.
- Updated `SectionsModule` to wire the section write repository, create use case, and unit of work.
- Removed the now-unused `SectionsService.create()` method while leaving section update/delete/reorder/set-products behavior in the legacy service for later slices.
- Kept route path, guard, request body shape, response body shape, public sections behavior, delivery areas, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused section tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-section.use-case.test.ts test/contexts/admin/list-admin-sections.use-case.test.ts test/contexts/admin/mikro-orm-admin-section-write.repository.test.ts test/contexts/admin/mikro-orm-admin-section.read-repository.test.ts test/modules/sections/section.mapper.test.ts` - 7 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 291 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new section write application files, write adapter, section controller/module/service files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched section controller and `AdminSectionResponseDto` returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scan confirmed `service.create` and `SectionsService.create()` references are gone from the sections route path.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/sections` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/admin/sections` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local section data.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `CreateAdminSectionUseCase` is a thin orchestrator: it opens the transaction, asks the write port to create the section inside that context, and returns the mutation model.
- `MikroOrmAdminSectionWriteRepository` is the only new section create file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves the legacy create defaults and schedule normalization while moving persistence out of `SectionsService`.
- The controller route path and guard stayed stable, and the controller maps the request DTO into an application command before mapping the mutation model into the response DTO.
- Self-review found no behavior drift or missing in-scope verification after the initial implementation; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated section create against local data to avoid mutating section order and fixtures; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- `count(Section, {})` for sort order preserves legacy behavior but is not concurrency-safe if multiple admins create sections simultaneously; changing that would be a deliberate behavior/consistency improvement outside this preservation slice.
- Section update/delete/reorder/set-products routes still call `SectionsService` and need use-case-owned transaction boundaries.
- Next recommended slice is `PUT /api/admin/sections/:id` behind the same section write repository/use case, preserving current partial update behavior and `Seção não encontrada` not-found response.

### 2026-05-07 - Phase 8 - Admin section update use-case slice

Status: Done

Changed:
- Moved `PUT /api/admin/sections/:id` off `SectionsService.update()` and onto `UpdateAdminSectionUseCase`.
- Added `AdminSectionNotFoundError` for application-level missing-section translation.
- Extended `AdminSectionWriteRepository` with `update(id, data, context)` and reused `MikroOrmAdminSectionWriteRepository` for section create and update writes.
- Split the section mutation models so create keeps the legacy `productCount` and `products` fields while update returns the legacy slimmer mutation response.
- Added Swagger-visible `AdminSectionMutationResponseDto` and `toAdminSectionMutationResponseDto()` for the update response contract.
- Preserved legacy update behavior: partial field updates, weekly schedule normalization, `null` schedule clearing, `Seção não encontrada` HTTP message, and response fields `id`, `label`, `emoji`, `sortOrder`, `isActive`, and `availabilitySchedule`.
- Updated section write/use-case/mapper tests for create/update model separation and missing-section behavior.
- Removed the now-unused `SectionsService.update()` method while leaving section delete/reorder/set-products behavior in the legacy service for later slices.
- Kept route path, guard, request body shape, public sections behavior, section delete/reorder/set-products, delivery areas, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused section tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-section.use-case.test.ts test/contexts/admin/update-admin-section.use-case.test.ts test/contexts/admin/list-admin-sections.use-case.test.ts test/contexts/admin/mikro-orm-admin-section-write.repository.test.ts test/contexts/admin/mikro-orm-admin-section.read-repository.test.ts test/modules/sections/section.mapper.test.ts` - 12 tests passed after fixing a test-only create/update model type mismatch.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 296 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new section update application files, section write port/adapter, response DTO, mapper, section controller/module/service files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched section controller and admin section response DTO file returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `AdminSectionMutationResponseDto` returned `ok`.
- Stale-reference scan confirmed `service.update` and `SectionsService.update()` references are gone from the sections route path; remaining `update` matches are repository/fake methods and the controller route method.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/sections/:id` `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PUT /api/admin/sections/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local section data.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `UpdateAdminSectionUseCase` is a thin orchestrator: it opens the transaction, asks the write port to update the section inside that context, and translates a missing model into an application error.
- `MikroOrmAdminSectionWriteRepository` remains the only touched section update file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy partial update semantics and schedule normalization while keeping the database transaction boundary owned by the use case.
- The controller route path and guard stayed stable, and the controller maps the request DTO into an application command before translating the application not-found error back to the legacy HTTP message.
- Self-review found no behavior drift or missing in-scope verification after the test-only model type fix; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, DTO probe, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated section update against local data to avoid mutating section fixtures; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- Section delete/reorder/set-products routes still call `SectionsService` and need use-case-owned transaction boundaries.
- Next recommended slice is `DELETE /api/admin/sections/:id` behind the same section write repository/use case, preserving current hard-delete `removeAndFlush` behavior and `Seção não encontrada` not-found response.

### 2026-05-07 - Phase 8 - Admin section delete use-case slice

Status: Done

Changed:
- Moved `DELETE /api/admin/sections/:id` off `SectionsService.remove()` and onto `DeleteAdminSectionUseCase`.
- Extended `AdminSectionWriteRepository` with `delete(id, context)` and reused `MikroOrmAdminSectionWriteRepository` for section create, update, and delete writes.
- Preserved the legacy hard-delete behavior by keeping `em.removeAndFlush(section)` in the MikroORM adapter instead of changing section deletes into soft deletes.
- Reused `AdminSectionNotFoundError` for application-level missing-section translation.
- Added Swagger-visible `DeleteSectionResponseDto` for the moved route response.
- Updated `SectionsAdminController.remove` to call the use case, return the explicit response DTO, and preserve the `Seção não encontrada` HTTP message.
- Updated `SectionsModule` to wire the delete use case to the section write repository and `MikroOrmUnitOfWork`.
- Removed the now-unused `SectionsService.remove()` method while leaving section reorder/set-products behavior in the legacy service for later slices.
- Kept route path, guard, request body absence, public sections behavior, section reorder/set-products, delivery areas, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused section tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-section.use-case.test.ts test/contexts/admin/update-admin-section.use-case.test.ts test/contexts/admin/delete-admin-section.use-case.test.ts test/contexts/admin/list-admin-sections.use-case.test.ts test/contexts/admin/mikro-orm-admin-section-write.repository.test.ts test/contexts/admin/mikro-orm-admin-section.read-repository.test.ts test/modules/sections/section.mapper.test.ts` - 16 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 300 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new section delete application file, section write port/adapter, response DTO, section controller/module/service files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched section controller, admin section response DTO file, and `DeleteSectionResponseDto` returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Response DTO probe for `DeleteSectionResponseDto` returned `ok`.
- Stale-reference scan confirmed `service.remove` and `SectionsService.remove()` references are gone from the sections route path; the remaining `remove` match is the moved controller route method.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/sections/:id` `DELETE`.
- `pnpm smoke:api`
- Local unauthenticated route check for `DELETE /api/admin/sections/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local section data.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `DeleteAdminSectionUseCase` is a thin orchestrator: it opens the transaction, asks the write port to delete the section inside that context, translates a missing section into an application error, and returns the stable success result.
- `MikroOrmAdminSectionWriteRepository` remains the only touched section delete file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy hard-delete semantics and returns `false` without removal when the section does not exist.
- The controller route path and guard stayed stable, and the controller translates the application not-found error back to the legacy HTTP message.
- No behavior fixes were needed after self-review; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, DTO probe, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated section delete against local data to avoid deleting local section fixtures; transaction/use-case/adapter behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- Legacy hard deletes can remove sections that still have product links only if database constraints/cascades allow it; this slice intentionally preserved the existing behavior rather than changing delete semantics.
- Section reorder/set-products routes still call `SectionsService` and need use-case-owned transaction boundaries.
- Next recommended slice is `PATCH /api/admin/sections/reorder` behind the same section write repository/use case, preserving current behavior where missing section ids are skipped and one flush happens after the loop.

### 2026-05-07 - Phase 8 - Admin section reorder use-case slice

Status: Done

Changed:
- Moved `PATCH /api/admin/sections/reorder` off `SectionsService.reorderSections()` and onto `ReorderAdminSectionsUseCase`.
- Extended `AdminSectionWriteRepository` with `reorder(items, context)` and reused `MikroOrmAdminSectionWriteRepository` for section create, update, delete, and reorder writes.
- Preserved legacy reorder behavior: request `ids` are converted to zero-based sort positions, missing section ids are skipped, and one flush happens after the loop.
- Preserved the legacy empty response body by keeping `SectionsAdminController.reorder` as `Promise<void>` instead of introducing a success response DTO.
- Updated `SectionsModule` to wire the reorder use case to the section write repository and `MikroOrmUnitOfWork`.
- Removed the now-unused `SectionsService.reorderSections()` method while leaving section set-products behavior in the legacy service for a later slice.
- Kept route path, guard, request body shape, response body shape, public sections behavior, section set-products, delivery areas, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused section tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-section.use-case.test.ts test/contexts/admin/update-admin-section.use-case.test.ts test/contexts/admin/delete-admin-section.use-case.test.ts test/contexts/admin/reorder-admin-sections.use-case.test.ts test/contexts/admin/list-admin-sections.use-case.test.ts test/contexts/admin/mikro-orm-admin-section-write.repository.test.ts test/contexts/admin/mikro-orm-admin-section.read-repository.test.ts test/modules/sections/section.mapper.test.ts` - 18 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 302 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new section reorder application file, section write port/adapter, section controller/module/service files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched section controller and section response DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scan confirmed `service.reorderSections` and `SectionsService.reorderSections()` references are gone from the sections route path; the remaining `reorder` match is the moved controller route method.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/sections/reorder` `PATCH`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PATCH /api/admin/sections/reorder` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local section order.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `ReorderAdminSectionsUseCase` is a thin orchestrator: it maps route ids into ordered application items, opens the transaction, and asks the write port to persist the order.
- `MikroOrmAdminSectionWriteRepository` remains the only touched section reorder file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy skip-missing behavior and flushes once after processing all ids.
- The controller route path, guard, request DTO, and empty response body stayed stable.
- No behavior fixes were needed after self-review; focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route guard check all passed.

Risks:
- This slice did not execute an authenticated section reorder against local data to avoid mutating section order during the refactor loop; use-case/repository behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The reorder use case intentionally preserves legacy behavior and does not fail the whole request when an id is missing; changing that would be a deliberate route behavior change.
- Section set-products is the last admin section mutation route still calling `SectionsService` and needs use-case-owned transaction boundaries.
- Next recommended slice is `PUT /api/admin/sections/:id/products` behind section write/use-case boundaries, preserving existing behavior for replacing all section products, `Seção não encontrada`, `Produto {id} não encontrado`, and one final flush.

### 2026-05-07 - Phase 8 - Admin section set-products use-case slice

Status: Done

Changed:
- Moved `PUT /api/admin/sections/:id/products` off `SectionsService.setProducts()` and onto `SetAdminSectionProductsUseCase`.
- Extended `AdminSectionWriteRepository` with `setProducts(sectionId, productIds, context)` and typed outcomes for success, missing section, and missing product.
- Added `AdminSectionProductNotFoundError` so application code can report the missing product id without importing Nest exceptions.
- Updated `MikroOrmAdminSectionWriteRepository` to load the section with current product links through the provided transaction context, pre-validate all requested product ids before queuing removals/creates, remove existing links, recreate ordered `SectionProduct` rows, and flush once on success.
- Preserved the legacy route contract: empty response body, `Seção não encontrada` for missing sections, `Produto {id} não encontrado` for missing products, duplicate product ids processed in request order, and no partial flush on missing products.
- Updated `SectionsAdminController.setProducts` to map the HTTP DTO into an application command and translate application errors back to the existing HTTP messages.
- Updated `SectionsModule` to wire `SetAdminSectionProductsUseCase` to the section write repository and `MikroOrmUnitOfWork`.
- Removed the now-unused `SectionsService.setProducts()` method while leaving `SectionsService` as the public sections compatibility facade.
- Added focused set-products use-case tests and section write adapter tests for success, missing section, and missing product before mutation.
- Updated existing section write fake repositories to implement the expanded port.
- Kept route path, guard, request body shape, public sections behavior, delivery areas, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused section tests initially found a test-only fixture issue using `Collection.add()` without MikroORM metadata; the fake section fixture was fixed to stub `products.getItems()` directly and the focused command was rerun.
- Focused section tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/admin/create-admin-section.use-case.test.ts test/contexts/admin/update-admin-section.use-case.test.ts test/contexts/admin/delete-admin-section.use-case.test.ts test/contexts/admin/reorder-admin-sections.use-case.test.ts test/contexts/admin/set-admin-section-products.use-case.test.ts test/contexts/admin/list-admin-sections.use-case.test.ts test/contexts/admin/mikro-orm-admin-section-write.repository.test.ts test/contexts/admin/mikro-orm-admin-section.read-repository.test.ts test/modules/sections/section.mapper.test.ts` - 24 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new set-products application file, section write port/adapter, section controller/module/service files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched section controller and section response DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scan confirmed `service.setProducts`, `SectionsService.setProducts`, and the legacy service method signature are gone.
- `pnpm --filter api test:unit` - 308 tests passed.
- `pnpm --filter api build`
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/sections/:id/products` `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PUT /api/admin/sections/00000000-0000-4000-8000-000000000000/products` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local section products.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `SetAdminSectionProductsUseCase` is a thin orchestrator: it opens the transaction, asks the write port to replace section products, and translates typed repository outcomes into application errors.
- `MikroOrmAdminSectionWriteRepository` remains the only touched section set-products file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter deliberately pre-validates product ids before calling `em.remove()`/`em.create()` so a missing product cannot leave queued changes inside the unit-of-work transaction.
- The controller route path, guard, request DTO, and empty response body stayed stable, and the controller maps HTTP errors without leaking DTOs or Nest exceptions into application code.
- Focused tests, API typecheck, full API unit tests, web typecheck, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scan, fresh boot, smoke, and route guard check all passed after the test-harness fix.

Risks:
- This slice did not execute an authenticated section product replacement against local data to avoid mutating local section product fixtures; use-case/repository behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- Section product replacement still performs one product lookup per requested id, matching the legacy behavior. A future performance improvement could batch-load products, but that would need deliberate duplicate-id/order preservation tests.
- `SectionsService.listPublic` remains as legacy-adjacent compatibility code, but public section routes already use `GetPublicSectionsUseCase`; removal belongs in the final cleanup phase after a stale-call scan.
- Next recommended slice is to re-read this guide, inspect the remaining unchecked Phase 8/Phase 9 surfaces, and start Phase 9 with delivery areas because delivery is the smallest supporting context and is listed first in the suggested order.

### 2026-05-07 - Phase 9 - Delivery area read use-case slice

Status: Done

Changed:
- Started Phase 9 with delivery area read paths only.
- Added `DeliveryAreaReadModel`, `DeliveryAreaReadRepository`, `ListActiveDeliveryAreasUseCase`, `ListAdminDeliveryAreasUseCase`, and `MikroOrmDeliveryAreaReadRepository`.
- Moved `GET /api/delivery-areas` and `GET /api/admin/delivery-areas` off `DeliveryAreasService.listActive()` / `listAll()` and onto delivery read use cases.
- Added `DeliveryAreaResponseDto` and `toDeliveryAreaResponseDto()` so the moved routes return explicit Swagger-visible response DTOs.
- Removed `DeliveryAreasService.listActive()` and `listAll()` while leaving delivery create/update/delete in the legacy service for later Phase 9 write slices.
- Cleaned touched delivery DTO/controller/service code for the Swagger/OOP rules: regular controller/DTO imports, class-validator request DTO fields, JSDoc descriptions, explicit response return types, explicit service return types, no definite assignment assertions, no `any`, and no non-null assertions.
- Deleted delivery `.gitkeep` placeholders replaced by real application/adapter files.
- Kept route paths, guards, response key shape, delivery create/update/delete behavior, order delivery-fee behavior, customers, loyalty, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused delivery tests after the self-review fix: `pnpm --filter api exec node --test -r ts-node/register test/contexts/delivery/delivery-area-key.policy.test.ts test/contexts/delivery/list-delivery-areas.use-case.test.ts test/contexts/delivery/mikro-orm-delivery-area.read-repository.test.ts test/modules/delivery-areas/delivery-area.mapper.test.ts` - 8 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 313 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new delivery application files, read adapter, response DTO, mapper, delivery controller/module/service files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched delivery controller, module, and response DTO files returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed legacy delivery read service calls are gone from the moved routes.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/delivery-areas` `GET` and `/api/admin/delivery-areas` `GET`.
- `pnpm smoke:api`
- Local public route check for `GET /api/delivery-areas` returned `200` with delivery area objects containing `id`, `neighborhood`, `city`, `fee`, `normalizedKey`, and `isActive`.
- Local unauthenticated route check for `GET /api/admin/delivery-areas` returned `401` and `{"message":"Unauthorized","statusCode":401}` without exposing admin delivery-area data.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `ListActiveDeliveryAreasUseCase` and `ListAdminDeliveryAreasUseCase` are thin read orchestrators and depend only on an application read repository port.
- `MikroOrmDeliveryAreaReadRepository` is the only new delivery read file that imports MikroORM or ORM entities.
- The adapter preserves the legacy query shape for active and admin lists: order by `city ASC, neighborhood ASC`, parse decimal fees into numbers, and default missing `isActive` to `true`.
- The controller route paths and guards stayed stable, and moved read routes map read models into explicit response DTO classes instead of returning legacy service objects.
- Self-review found missing explicit service return types/accessibility and missing delivery DTO JSDoc comments; those were fixed, then focused tests, typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, fresh boot, smoke, and route checks were rerun.

Risks:
- This slice did not execute an authenticated admin delivery-area read against local data to avoid exposing admin data in the verification transcript; use-case/repository/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- Delivery create/update/delete still run through `DeliveryAreasService` and do not yet have use-case-owned write transaction boundaries.
- `DeliveryAreasService.findById()` still exists for order delivery-fee compatibility; removing or replacing it belongs with a later delivery/order cleanup slice.
- Next recommended slice is `POST /api/admin/delivery-areas` behind a delivery write repository/use case, preserving duplicate normalized-key validation, `Essa área de entrega já existe`, response shape, and transaction boundaries.

### 2026-05-07 - Phase 9 - Delivery area create use-case slice

Status: Done

Changed:
- Moved `POST /api/admin/delivery-areas` off `DeliveryAreasService.create()` and onto `CreateDeliveryAreaUseCase`.
- Added `DeliveryAreaWriteRepository`, `CreateDeliveryAreaData`, `DeliveryAreaMutationModel`, `DeliveryAreaAlreadyExistsError`, and `MikroOrmDeliveryAreaWriteRepository`.
- Kept delivery-area normalized-key creation in the delivery domain policy through `DeliveryAreaKeyPolicy`, with the use case passing the normalized key into the write port.
- Kept the create write transaction owned by the use case through `MikroOrmUnitOfWork`.
- Preserved legacy create behavior: duplicate normalized-key validation, `Essa área de entrega já existe` HTTP message, decimal fee persistence through `fee.toFixed(2)`, default active state, and the same response key shape.
- Updated `AdminDeliveryAreasController` to map the HTTP DTO into an application command, translate the application duplicate error into the existing `400`, and return `DeliveryAreaResponseDto` through the adapter mapper.
- Updated `DeliveryAreasModule` to wire the write repository, unit of work, and create use case.
- Removed the now-unused `DeliveryAreasService.create()` method while leaving update/delete/find-by-id behavior in the legacy service for later slices.
- Kept route path, guard, request body shape, delivery update/delete behavior, order delivery-fee behavior, customers, loyalty, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused delivery tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/delivery/delivery-area-key.policy.test.ts test/contexts/delivery/list-delivery-areas.use-case.test.ts test/contexts/delivery/create-delivery-area.use-case.test.ts test/contexts/delivery/mikro-orm-delivery-area.read-repository.test.ts test/contexts/delivery/mikro-orm-delivery-area-write.repository.test.ts test/modules/delivery-areas/delivery-area.mapper.test.ts` - 12 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 317 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over delivery domain/application files, adapters, controller/module/service files, DTO/mapper files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched delivery controller/module/DTO surface returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `DeliveryAreasService.create()` and `service.create(...)` are gone from delivery route code.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/delivery-areas` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/admin/delivery-areas` returned `401` and `{"message":"Unauthorized","statusCode":401}` without inserting local delivery-area data.
- Local public route check for `GET /api/delivery-areas` returned `200`, confirming the read path still resolves after the module wiring change.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `CreateDeliveryAreaUseCase` is a thin write orchestrator: it computes the normalized key through the domain policy, opens the transaction, asks the write port to create, and translates duplicate repository outcomes into an application error.
- `MikroOrmDeliveryAreaWriteRepository` is the only new create file that imports MikroORM transaction infrastructure or ORM entities.
- The adapter preserves legacy duplicate checking and decimal persistence while moving entity creation out of `DeliveryAreasService`.
- The controller route path and guard stayed stable, and the controller no longer sends HTTP DTOs into delivery application code.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated delivery-area create against local data to avoid inserting local admin fixtures; use-case/repository behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The duplicate check preserves the legacy find-then-create behavior and is still not a database-level concurrency guarantee unless a unique constraint exists.
- Delivery update/delete still run through `DeliveryAreasService` and need use-case-owned write transaction boundaries.
- Next recommended slice is `PUT /api/admin/delivery-areas/:id` behind the same delivery write repository/use case, preserving partial update behavior, duplicate normalized-key validation, `Área de entrega não encontrada`, and `Essa área de entrega já existe`.

### 2026-05-07 - Phase 9 - Delivery area update use-case slice

Status: Done

Changed:
- Moved `PUT /api/admin/delivery-areas/:id` off `DeliveryAreasService.update()` and onto `UpdateDeliveryAreaUseCase`.
- Extended `DeliveryAreaWriteRepository` with `UpdateDeliveryAreaData` and `UpdateDeliveryAreaResult`.
- Added `DeliveryAreaNotFoundError` so the application layer reports missing delivery areas without importing Nest HTTP exceptions.
- Updated `MikroOrmDeliveryAreaWriteRepository` to load the target delivery area, precompute the next normalized key before mutating the ORM entity, check duplicate normalized keys, apply partial updates, and flush inside the provided unit-of-work transaction context.
- Kept delivery-area key normalization in `DeliveryAreaKeyPolicy` and kept the use case thin: omit undefined fields, open the transaction, call the write port, and translate repository outcomes into application errors.
- Updated `AdminDeliveryAreasController` to translate application errors into the existing `404`/`400` Portuguese messages and return `DeliveryAreaResponseDto` through `toDeliveryAreaResponseDto()`.
- Removed the now-unused `DeliveryAreasService.update()` method while leaving delete and order compatibility behavior in the legacy service for later Phase 9 slices.
- Kept route path, guard, request body shape, delivery create/read/delete behavior, order delivery-fee behavior, customers, loyalty, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused delivery tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/delivery/delivery-area-key.policy.test.ts test/contexts/delivery/list-delivery-areas.use-case.test.ts test/contexts/delivery/create-delivery-area.use-case.test.ts test/contexts/delivery/update-delivery-area.use-case.test.ts test/contexts/delivery/mikro-orm-delivery-area.read-repository.test.ts test/contexts/delivery/mikro-orm-delivery-area-write.repository.test.ts test/modules/delivery-areas/delivery-area.mapper.test.ts` - 18 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 323 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over delivery domain/application files, adapters, controller/module/service files, DTO/mapper files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched delivery controller/module/DTO surface returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `DeliveryAreasService.update()` and `service.update(...)` are gone from delivery route code.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/delivery-areas/:id` `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PUT /api/admin/delivery-areas/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local delivery-area data.
- Local public route check for `GET /api/delivery-areas` returned `200`, confirming the read path still resolves after the module wiring change.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `UpdateDeliveryAreaUseCase` is a thin write orchestrator and depends only on the write repository port, unit-of-work port, and application/domain delivery types.
- The update adapter is the only new update path that imports MikroORM transaction infrastructure or ORM entities.
- The duplicate check happens before mutating the ORM entity, avoiding transactional auto-flush of a dirty duplicate state before the duplicate lookup.
- Partial update behavior preserves legacy semantics: only provided fields are changed, `fee` persists through `toFixed(2)`, `isActive` is preserved unless explicitly sent, and the response key shape stays unchanged.
- The controller route path and guard stayed stable, and the controller no longer sends HTTP DTOs into delivery application code.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated delivery-area update against local data to avoid mutating local admin fixtures; use-case/repository behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The duplicate check preserves the legacy find-then-update behavior and is still not a database-level concurrency guarantee unless a unique constraint exists.
- Delivery delete still runs through `DeliveryAreasService` and needs use-case-owned write transaction boundaries.
- Next recommended slice is `DELETE /api/admin/delivery-areas/:id` behind the same delivery write repository/use case, preserving soft-delete behavior, `Área de entrega não encontrada`, and route response semantics.

### 2026-05-07 - Phase 9 - Delivery area delete use-case slice

Status: Done

Changed:
- Moved `DELETE /api/admin/delivery-areas/:id` off `DeliveryAreasService.remove()` and onto `DeleteDeliveryAreaUseCase`.
- Extended `DeliveryAreaWriteRepository` with `DeleteDeliveryAreaResult` and a delete method that participates in the provided unit-of-work transaction context.
- Updated `MikroOrmDeliveryAreaWriteRepository` to preserve the legacy soft-delete behavior by setting `isActive = false`, flushing, and returning `not-found` without flushing when the delivery area is missing.
- Updated `AdminDeliveryAreasController` to call the delete use case and translate `DeliveryAreaNotFoundError` into the existing `Área de entrega não encontrada` `404`.
- Removed the now-unused `DeliveryAreasService.remove()` method; `DeliveryAreasService.findById()` remains for order delivery-fee compatibility until a later delivery/order cleanup slice.
- Kept route path, guard, response semantics, delivery read/create/update behavior, order delivery-fee behavior, customers, loyalty, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused delivery tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/delivery/delivery-area-key.policy.test.ts test/contexts/delivery/list-delivery-areas.use-case.test.ts test/contexts/delivery/create-delivery-area.use-case.test.ts test/contexts/delivery/update-delivery-area.use-case.test.ts test/contexts/delivery/delete-delivery-area.use-case.test.ts test/contexts/delivery/mikro-orm-delivery-area.read-repository.test.ts test/contexts/delivery/mikro-orm-delivery-area-write.repository.test.ts test/modules/delivery-areas/delivery-area.mapper.test.ts` - 22 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 327 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over delivery domain/application files, adapters, controller/module/service files, DTO/mapper files, and touched tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched delivery controller/module/DTO surface returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `DeliveryAreasService.remove()` and `service.remove(...)` are gone from delivery route code; the only `remove` scan hit is the controller route method itself.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/delivery-areas/:id` `DELETE`.
- `pnpm smoke:api`
- Local unauthenticated route check for `DELETE /api/admin/delivery-areas/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local delivery-area data.
- Local public route check for `GET /api/delivery-areas` returned `200`, confirming the read path still resolves after the module wiring change.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `DeleteDeliveryAreaUseCase` is a thin write orchestrator and depends only on the write repository port, unit-of-work port, and application delivery error.
- The delete adapter is the only delete path that imports MikroORM transaction infrastructure or ORM entities.
- Soft-delete behavior preserves the legacy route semantics: found rows are marked inactive and missing rows become the same `Área de entrega não encontrada` HTTP error at the controller boundary.
- The admin delivery controller no longer injects `DeliveryAreasService`; that service is now limited to the remaining order compatibility read.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated delivery-area delete against local data to avoid mutating local admin fixtures; use-case/repository behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- `DeliveryAreasService.findById()` still exists because order delivery-fee lookup depends on it; removing or replacing it should happen only with an order delivery-area port cleanup slice.
- Next recommended slice is to inspect the remaining Phase 9 surfaces and choose the smallest safe supporting context slice, likely customer profile/read behavior before loyalty and coupons.

### 2026-05-07 - Phase 9 - Admin customer list read-use-case slice

Status: Done

Changed:
- Moved `GET /api/admin/customers` off `CustomersService.listAll()` and onto `ListAdminCustomersUseCase`.
- Added `AdminCustomerReadModel`, `AdminCustomerReadRepository`, and `MikroOrmAdminCustomerReadRepository` in the customers context.
- Preserved the legacy admin customer query behavior: optional `name`/`phone` `$like` search, `createdAt DESC` ordering, one order count per customer, ISO `memberSince`, and `isAdmin: false` in the list response.
- Added `AdminCustomerResponseDto` and `toAdminCustomerResponseDto()` so the moved admin route returns an explicit Swagger-visible response DTO.
- Wired `ListAdminCustomersUseCase` through `CustomersModule` and exported it for `AdminController`.
- Removed the now-unused `CustomersService.listAll()` helper and the customer context `.gitkeep` placeholders replaced by real files.
- Kept route path, guard, search query name, response key shape, customer login/register/profile/orders/loyalty/redeemable behavior, order creation behavior, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused customer/admin tests: `pnpm --filter api exec node --test -r ts-node/register test/contexts/customers/list-admin-customers.use-case.test.ts test/contexts/customers/mikro-orm-admin-customer.read-repository.test.ts test/modules/admin/admin-customer.mapper.test.ts` - 4 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 331 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new customers context files, admin customer mapper/DTO, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and admin customer response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.listAll()` and `customersService.listAll(...)` are gone from admin/customer source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/customers` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/customers?search=9999` returned `401` and `{"message":"Unauthorized","statusCode":401}` without exposing local customer data.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves after the module provider change.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `ListAdminCustomersUseCase` is a thin read orchestrator and depends only on the customer read repository port.
- `MikroOrmAdminCustomerReadRepository` is the only new customer list file that imports MikroORM or ORM entities.
- The adapter deliberately preserves the legacy N+1 order-count behavior rather than changing query shape in the same slice.
- The admin controller keeps the same route and guard while mapping read models into explicit response DTOs.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated admin customer list against local data to avoid exposing local customer data in the verification transcript; use-case/repository/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The admin customer list still performs one order count per customer, matching the legacy behavior. Optimizing it should be a deliberate performance slice with payload and ordering tests.
- `CustomersService` still owns customer authentication, profile, orders, loyalty, redeemable products, order auto-create compatibility, and loyalty adjustment behavior.
- Next recommended slice is a customer authentication/profile preparation slice: introduce typed customer request/response DTO boundaries or a customer phone value object before moving authenticated customer routes off `CustomersService`.

### 2026-05-07 - Phase 9 - Customer profile read-use-case slice

Status: Done

Changed:
- Moved authenticated `GET /api/customers/me` profile reads off `CustomersService.getProfile()` and onto `GetCustomerProfileUseCase`.
- Added `CustomerProfileReadModel`, `CustomerProfileReadRepository`, `CustomerProfileNotFoundError`, and `MikroOrmCustomerProfileReadRepository` in the customers context.
- Preserved the legacy profile response behavior: active-customer lookup by id, `hasPassword`, loyalty point balance, admin-phone flag only when a password exists, customer order count, and ISO `memberSince`.
- Added `CustomerProfileResponseDto` and `toCustomerProfileResponseDto()` so the moved customer route returns an explicit Swagger-visible response DTO.
- Wired `GetCustomerProfileUseCase` through `CustomersModule` and exported it.
- Removed the now-unused `CustomersService.getProfile()` helper.
- Tightened the touched customer controller boundary by replacing request `any` with a typed customer request and adding explicit public method accessibility and return types.
- Kept route path, guard, response key shape, customer identify/register/login/set-password/orders/loyalty/redeemable behavior, order creation behavior, admin customer list behavior, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused customer profile tests after self-review fix: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/get-customer-profile.use-case.test.ts test/contexts/customers/mikro-orm-customer-profile.read-repository.test.ts test/modules/customers/customer.mapper.test.ts` - 6 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 337 tests passed.
- `pnpm --filter api build`
- Full domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new customers context files, customer mapper/DTO, touched customer controller, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched customer controller and customer profile response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.getProfile()` and `customersService.getProfile(...)` are gone from customer source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/customers/me` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/customers/me` returned `401` and `{"message":"Token inválido","error":"Unauthorized","statusCode":401}` without exposing local customer data.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves after the module provider change.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `GetCustomerProfileUseCase` is a thin read orchestrator and depends only on the customer profile read repository port.
- `MikroOrmCustomerProfileReadRepository` is the only new customer profile file that imports MikroORM or ORM entities.
- The adapter preserves the legacy profile query shape and uses a guarded date helper instead of a non-null assertion for `createdAt`.
- The customer controller keeps the same route and guard while mapping the read model into an explicit response DTO.
- Self-review found legacy missing method accessibility/return types in the touched customer controller; those were fixed, then focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks were rerun.

Risks:
- This slice did not execute an authenticated customer profile read against local data to avoid exposing local customer data in the verification transcript; use-case/repository/mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the 401 check.
- The profile route still receives a MikroORM `Customer` entity from `CustomerTokenGuard`; removing that entity leak belongs with the customer authentication/token port slice.
- `CustomersService` still owns customer identify/register/login/set-password/orders/loyalty/redeemable behavior, order auto-create compatibility, and loyalty adjustment behavior.
- Next recommended slice is a small customer authentication boundary slice: introduce a phone value object and/or customer token profile port before moving `identify`, `register`, `login`, and `set-password` off `CustomersService`.

### 2026-05-07 - Phase 9 - Customer phone value-object slice

Status: Done

Changed:
- Added `CustomerPhone` as a customers domain value object for normalized customer phone values.
- Preserved the legacy digit-only normalization rule exactly, including permissive handling of malformed input.
- Updated `CustomersService` to use `CustomerPhone.from(phone).value` in the existing customer identify, register, login, and order auto-create compatibility paths.
- Added focused tests for normalization, permissive malformed input behavior, and value-object equality.
- Kept customer auth routes, token generation, password hashing/comparison, persistence behavior, order creation behavior, loyalty, coupons, controllers, DTOs, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused customer domain tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/customer-phone.value-object.test.ts test/contexts/customers/loyalty-points.policy.test.ts` - 7 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 340 tests passed.
- `pnpm --filter api build`
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the customers domain value object, focused test, and touched customer service returned no `any`, non-null assertions, or definite assignment assertions.
- Stale normalization scan confirmed the previous inline `phone.replace(/\D/g, '')` customer/order normalization paths in customer/order source are gone.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/customers/identify` `POST`.
- `pnpm smoke:api`
- Local non-mutating route check for `POST /api/customers/identify` with an unknown formatted phone returned `201` and `{"exists":false,"action":"register"}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `CustomerPhone` is a small value object with explicit access modifiers, explicit return types, immutable normalized state, and equality behavior.
- The value object intentionally does not add stricter validation yet because existing route DTOs and order/customer flows did not previously reject malformed normalized phone values in the service normalization step.
- The legacy service is still the only touched file importing the new value object from Nest land; the domain value object does not import Nest, MikroORM, entities, adapters, DTOs, or controllers.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- `CustomerPhone` currently preserves legacy permissiveness. Adding phone-length or country-specific validation should be a dedicated behavior-change slice with route and order-creation tests.
- Customer identify/register/login/set-password still run through `CustomersService`; the value object only prepares a domain boundary for moving those use cases.
- `CustomersService.findOrCreateByPhone()` still exists for order auto-create compatibility.
- Next recommended slice is `POST /api/customers/identify` behind a customer auth use case and write repository, preserving response variants, token regeneration for no-password customers, and the existing status/body contract.

### 2026-05-07 - Phase 9 - Customer identify use-case slice

Status: Done

Changed:
- Moved `POST /api/customers/identify` off `CustomersService.identify()` and onto `IdentifyCustomerUseCase`.
- Added `CustomerIdentityRepository`, `CustomerIdentityModel`, identify repository result types, and `MikroOrmCustomerIdentityRepository`.
- Kept the identify write boundary owned by the use case through `MikroOrmUnitOfWork`; the adapter participates in the provided transaction context.
- Preserved legacy identify behavior: normalized phone lookup, missing customer response `{"exists":false,"action":"register"}`, password customer response `{"exists":true,"hasPassword":true,"action":"login"}`, passwordless customer token regeneration, flush, log, and authenticated customer summary with `isAdmin:false`.
- Added `IdentifyCustomerResponseDto`, `IdentifyCustomerSummaryResponseDto`, and `IdentifyCustomerActionDto` so the moved route has an explicit Swagger-visible response DTO without manual `@Api*` decorators.
- Updated `CustomersController.identify` to call the use case and map the application result through `toIdentifyCustomerResponseDto()`.
- Wired `IdentifyCustomerUseCase`, `CUSTOMER_IDENTITY_REPOSITORY`, and `MikroOrmUnitOfWork` through `CustomersModule`.
- Removed the now-unused `CustomersService.identify()` method.
- Kept route path, request body shape, default `201` POST status, register/login/set-password/profile/orders/loyalty/redeemable behavior, order creation behavior, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused identify tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/customer-phone.value-object.test.ts test/contexts/customers/identify-customer.use-case.test.ts test/contexts/customers/mikro-orm-customer-identity.repository.test.ts test/modules/customers/customer.mapper.test.ts` - 13 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api test:unit` - 349 tests passed.
- `pnpm --filter api build`
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new customer identity application files, domain files, identity adapter, touched customer controller/mapper/DTO, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched customer controller and identify response/request DTOs returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.identify()` and `customersService.identify(...)` are gone from customer source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/customers/identify` `POST`.
- `pnpm smoke:api`
- Local non-mutating route check for `POST /api/customers/identify` with an unknown formatted phone returned `201` and `{"exists":false,"action":"register"}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `IdentifyCustomerUseCase` is a thin orchestrator: normalize the phone through the domain value object, open the unit of work, call the identity port, and map repository outcomes to application results.
- `MikroOrmCustomerIdentityRepository` is the only new identify path that imports Nest logging, crypto token generation, MikroORM transaction context, or ORM entities.
- Response DTO mapping preserves the legacy JSON key shape because optional constructor fields with `undefined` serialize out of the response.
- The controller keeps the same route and request DTO while returning an explicit response DTO class.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute the password-required or passwordless-authenticated route branches against local data to avoid exposing or mutating local customer tokens; use-case, adapter, and mapper tests cover those branches.
- The identify adapter still preserves the legacy find-then-update token rotation behavior and relies on the existing unique token constraint/default behavior.
- Customer register, login, set-password, orders, loyalty, redeemable products, order auto-create compatibility, and loyalty adjustment behavior still live in `CustomersService`.
- Next recommended slice is `POST /api/customers/register` behind a customer auth use case and write repository, preserving duplicate phone validation, password hashing, token creation, admin-phone check, response shape, and existing `Telefone já cadastrado` error.

### 2026-05-07 - Phase 9 - Customer register use-case slice

Status: Done

Changed:
- Moved `POST /api/customers/register` off `CustomersService.register()` and onto `RegisterCustomerUseCase`.
- Added `CustomerRegistrationRepository`, registration command/result models, `CustomerAlreadyExistsError`, and `MikroOrmCustomerRegistrationRepository`.
- Kept the registration write boundary owned by the use case through `MikroOrmUnitOfWork`; the adapter participates in the provided transaction context.
- Preserved legacy register behavior: digit-only phone normalization, duplicate phone detection, bcrypt password hashing with cost 10, token creation, `loyaltyPoints: 0`, active customer creation, flush, registration log, admin-phone check after creation, and response shape.
- Added `RegisterCustomerResponseDto` and `RegisteredCustomerResponseDto` so the moved route has an explicit Swagger-visible response DTO without manual `@Api*` decorators.
- Updated `CustomersController.register` to call the use case, map the application result through `toRegisterCustomerResponseDto()`, and translate `CustomerAlreadyExistsError` into the existing `Telefone já cadastrado` `409`.
- Wired `RegisterCustomerUseCase`, `CUSTOMER_REGISTRATION_REPOSITORY`, and `MikroOrmUnitOfWork` through `CustomersModule`.
- Removed the now-unused `CustomersService.register()` method.
- Kept route path, request body shape, default `201` POST status, identify/login/set-password/profile/orders/loyalty/redeemable behavior, order creation behavior, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused register tests after self-review strictness fix: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/customer-phone.value-object.test.ts test/contexts/customers/register-customer.use-case.test.ts test/contexts/customers/mikro-orm-customer-registration.repository.test.ts test/modules/customers/customer.mapper.test.ts` - 12 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 354 tests passed.
- An initial parallel full-suite invocation crashed one unrelated admin test worker inside Node/V8 with `SIGTRAP`; the isolated crashed file passed, and the deterministic single-worker full-suite rerun passed 354/354.
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new registration application files, adapter, response DTO, and focused tests returned no `any`, non-null assertions, or definite assignment assertions; self-review also fixed inferred class-field types in the new adapter/test classes.
- Swagger scan over the touched customer controller and register response/request DTOs returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.register()` and `customersService.register(...)` are gone from customer source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/customers/register` `POST`.
- `pnpm smoke:api`
- Local non-mutating route validation check for `POST /api/customers/register` with an invalid name/password returned `400` with validation messages.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `RegisterCustomerUseCase` is a thin orchestrator: normalize the phone through the domain value object, open the unit of work, call the registration port, and translate duplicate results into an application error.
- `MikroOrmCustomerRegistrationRepository` is the only new register path that imports Nest logging, bcrypt, crypto token generation, MikroORM transaction context, or ORM entities.
- The adapter deliberately preserves the legacy find-then-create duplicate behavior and the post-flush admin-phone check instead of changing concurrency or query behavior in this slice.
- The controller keeps the same route and request DTO while returning an explicit response DTO class.
- Self-review found inferred class-field types in the new adapter/test classes; those were fixed, then focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks were rerun.

Risks:
- This slice did not execute a successful live register request against local data to avoid inserting a customer; use-case, adapter, and mapper tests cover valid registration and duplicate handling, and route wiring/validation behavior is covered by fresh Nest boot plus the invalid-body `400` check.
- The registration adapter still preserves the legacy find-then-create duplicate check and does not add a database-level concurrency guarantee.
- Customer login, set-password, orders, loyalty, redeemable products, order auto-create compatibility, and loyalty adjustment behavior still live in `CustomersService`.
- Next recommended slice is `POST /api/customers/login` behind a customer auth use case and write repository, preserving invalid credential messages, bcrypt password comparison, token regeneration, admin-phone check, response shape, and existing status/body contract.

### 2026-05-07 - Phase 9 - Customer login use-case slice

Status: Done

Changed:
- Moved `POST /api/customers/login` off `CustomersService.login()` and onto `LoginCustomerUseCase`.
- Added `CustomerLoginRepository`, login credentials/result models, `CustomerInvalidCredentialsError`, `CustomerInvalidPasswordError`, and `MikroOrmCustomerLoginRepository`.
- Kept the login write boundary owned by the use case through `MikroOrmUnitOfWork`; the adapter participates in the provided transaction context.
- Preserved legacy login behavior: digit-only phone normalization, missing/passwordless customer message `Credenciais inválidas`, wrong-password message `Senha incorreta`, bcrypt password comparison, token regeneration, flush, login log, admin-phone check after authentication, and response shape.
- Added `LoginCustomerResponseDto` and `LoggedInCustomerResponseDto` so the moved route has an explicit Swagger-visible response DTO without manual `@Api*` decorators.
- Updated `LoginDto` to use `declare public readonly` DTO fields with JSDoc descriptions, avoiding DTO non-null assertions while keeping class-validator metadata.
- Updated `CustomersController.login` to call the use case, map the application result through `toLoginCustomerResponseDto()`, and translate application login errors into the existing `401` messages.
- Wired `LoginCustomerUseCase`, `CUSTOMER_LOGIN_REPOSITORY`, and `MikroOrmUnitOfWork` through `CustomersModule`.
- Removed the now-unused `CustomersService.login()` method and its now-unused `UnauthorizedException`, `AdminUser`, and `checkIsAdmin` service code.
- Kept route path, request body shape, default `201` success status, identify/register/set-password/profile/orders/loyalty/redeemable behavior, order creation behavior, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused login tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/customer-phone.value-object.test.ts test/contexts/customers/login-customer.use-case.test.ts test/contexts/customers/mikro-orm-customer-login.repository.test.ts test/modules/customers/customer.mapper.test.ts` - 16 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 362 tests passed.
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new login application files, adapter, response/request DTOs, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched customer controller and login response/request DTOs returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.login()`, `customersService.login(...)`, and `ReturnType<CustomersService['login']>` are gone from customer source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/customers/login` `POST`.
- `pnpm smoke:api`
- Local non-mutating route check for `POST /api/customers/login` with an unknown phone returned `401` and `{"message":"Credenciais inválidas","error":"Unauthorized","statusCode":401}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `LoginCustomerUseCase` is a thin orchestrator: normalize the phone through the domain value object, open the unit of work, call the login port, and translate repository outcomes into application errors or a login result.
- `MikroOrmCustomerLoginRepository` is the only new login path that imports Nest logging, bcrypt, crypto token generation, MikroORM transaction context, or ORM entities.
- The adapter deliberately preserves legacy lookup behavior and does not add an `isActive` filter or change the password/error decision tree.
- The controller keeps the same route and request DTO while returning an explicit response DTO class.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute a successful live login against local data to avoid rotating a real local customer token; use-case, adapter, and mapper tests cover successful login, wrong-password login, missing customer login, passwordless customer login, token rotation, and admin-phone response behavior.
- Token rotation now happens inside the use-case-owned transaction boundary. This follows the refactor transaction rule and preserves successful behavior, but an infrastructure failure after flush and before transaction commit would roll the token change back rather than leaving a partially changed login.
- Customer set-password, orders, loyalty, redeemable products, order auto-create compatibility, and loyalty adjustment behavior still live in `CustomersService`.
- Next recommended slice is `POST /api/customers/set-password` behind a customer auth use case and write repository, preserving the authenticated guard boundary, existing `Já possui senha cadastrada` conflict message, bcrypt hashing, response shape, and not mutating order/loyalty behavior.

### 2026-05-07 - Phase 9 - Customer set-password use-case slice

Status: Done

Changed:
- Moved authenticated `POST /api/customers/set-password` off `CustomersService.setPassword()` and onto `SetCustomerPasswordUseCase`.
- Added `CustomerPasswordRepository`, set-password command/result models, `CustomerNotFoundError`, `CustomerPasswordAlreadySetError`, and `MikroOrmCustomerPasswordRepository`.
- Kept the password write boundary owned by the use case through `MikroOrmUnitOfWork`; the adapter participates in the provided transaction context.
- Preserved legacy set-password behavior: authenticated customer id input, existing-password conflict message `Já possui senha cadastrada`, bcrypt password hashing with cost 10, flush, set-password log, `isAdmin: false`, and response shape.
- Added `SetCustomerPasswordResponseDto` and `PasswordCustomerResponseDto` so the moved route has an explicit Swagger-visible response DTO without manual `@Api*` decorators.
- Updated `SetPasswordDto` to use a JSDoc-described `declare public readonly` DTO field, avoiding a DTO non-null assertion while keeping class-validator metadata.
- Updated `CustomersController.setPassword` to call the use case, map the application result through `toSetCustomerPasswordResponseDto()`, and translate application password errors into the existing HTTP conflict behavior plus a defensive not-found response.
- Wired `SetCustomerPasswordUseCase`, `CUSTOMER_PASSWORD_REPOSITORY`, and `MikroOrmUnitOfWork` through `CustomersModule`.
- Removed the now-unused `CustomersService.setPassword()` method and its now-unused bcrypt import, conflict import, and private customer formatter.
- Kept route path, request body shape, authenticated guard, identify/register/login/profile/orders/loyalty/redeemable behavior, order creation behavior, coupons, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused set-password tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/set-customer-password.use-case.test.ts test/contexts/customers/mikro-orm-customer-password.repository.test.ts test/modules/customers/customer.mapper.test.ts` - 13 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 369 tests passed.
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new set-password application files, adapter, response/request DTOs, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched customer controller and set-password response/request DTOs returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.setPassword()`, `customersService.setPassword(...)`, and `ReturnType<CustomersService['setPassword']>` are gone from customer source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/customers/set-password` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/customers/set-password` returned `401` and `{"message":"Token inválido","error":"Unauthorized","statusCode":401}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `SetCustomerPasswordUseCase` is a thin orchestrator: open the unit of work, call the password port, and translate repository outcomes into application errors or a set-password result.
- `MikroOrmCustomerPasswordRepository` is the only new set-password path that imports Nest logging, bcrypt, MikroORM transaction context, or ORM entities.
- The adapter deliberately looks up by authenticated customer id only, matching the legacy guard-provided active customer behavior more closely than adding a new active filter in this slice.
- The controller keeps the same route, guard, and request DTO while returning an explicit response DTO class.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute a successful live set-password request against local data to avoid mutating a real local customer password; use-case, adapter, and mapper tests cover success, missing customer, and already-set behavior, and route wiring/guard behavior is covered by fresh Nest boot plus the unauthenticated `401` check.
- The route still receives a MikroORM `Customer` entity from `CustomerTokenGuard`; removing that entity leak belongs with the customer authentication/token port slice.
- Customer orders, loyalty, redeemable products, order auto-create compatibility, and loyalty adjustment behavior still live in `CustomersService`.
- Next recommended slice is `GET /api/customers/loyalty` behind a customer loyalty read use case/read repository, preserving the current `balance`, `transactions`, `total`, `page`, and `totalPages` response shape and authenticated guard behavior before moving the larger customer order history route.

### 2026-05-07 - Phase 9 - Customer loyalty read-use-case slice

Status: Done

Changed:
- Moved authenticated `GET /api/customers/loyalty` off `CustomersService.getLoyalty()` and onto `GetCustomerLoyaltyUseCase`.
- Added `CustomerLoyaltyReadModel`, `CustomerLoyaltyReadRepository`, and `MikroOrmCustomerLoyaltyReadRepository`.
- Preserved the legacy loyalty response fields: `balance`, `transactions`, `total`, `page`, and `totalPages`.
- Preserved legacy transaction mapping: id, points, type, nullable description, ISO `createdAt`, descending `createdAt` order, `limit`, and `(page - 1) * limit` offset.
- Kept the existing controller pagination calculation in place: default page `1`, default limit `10`, minimum `1`, and maximum limit `50`.
- Added `CustomerLoyaltyResponseDto` and `CustomerLoyaltyTransactionResponseDto` so the moved route has an explicit Swagger-visible response DTO without manual `@Api*` decorators.
- Updated `CustomersController.getLoyalty` to call the use case, map the read model through `toCustomerLoyaltyResponseDto()`, and translate a missing active customer into `Cliente nao encontrado`.
- Wired `GetCustomerLoyaltyUseCase` and `CUSTOMER_LOYALTY_READ_REPOSITORY` through `CustomersModule`.
- Removed the now-unused `CustomersService.getLoyalty()` method.
- Kept route path, request query behavior, authenticated guard, customer orders, redeemable products, loyalty adjustment, order creation behavior, coupons, payments, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused loyalty tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/get-customer-loyalty.use-case.test.ts test/contexts/customers/mikro-orm-customer-loyalty.read-repository.test.ts test/modules/customers/customer.mapper.test.ts` - 12 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 374 tests passed.
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new loyalty application files, adapter, response DTO, touched controller/mapper, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched customer controller and loyalty response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.getLoyalty()`, `customersService.getLoyalty(...)`, and `ReturnType<CustomersService['getLoyalty']>` are gone from customer source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/customers/loyalty` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/customers/loyalty?page=1&limit=10` returned `401` and `{"message":"Token inválido","error":"Unauthorized","statusCode":401}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `GetCustomerLoyaltyUseCase` is a thin read orchestrator and depends only on the customer loyalty read repository port.
- `MikroOrmCustomerLoyaltyReadRepository` is the only new loyalty read path that imports MikroORM or ORM entities.
- The adapter uses an active-customer lookup by id before reading transactions, matching the current authenticated-customer profile read pattern and keeping stale/deactivated customer handling explicit.
- The controller keeps the same route, guard, query parsing, pagination bounds, and legacy response keys while returning an explicit response DTO class.
- No behavior fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated loyalty read against local data to avoid exposing local customer transaction data; use-case, adapter, and mapper tests cover the success and missing-customer branches, and route wiring/guard behavior is covered by fresh Nest boot plus the unauthenticated `401` check.
- The route still receives a MikroORM `Customer` entity from `CustomerTokenGuard`; removing that entity leak belongs with the customer authentication/token port slice.
- This read path now performs an explicit active-customer lookup inside the read adapter instead of reusing the guard-loaded entity. The extra read is acceptable for this low-volume authenticated endpoint and matches the current profile read adapter pattern.
- Customer orders, redeemable products, order auto-create compatibility, and loyalty adjustment behavior still live in `CustomersService`.
- Next recommended slice is `GET /api/customers/loyalty/redeemable` behind a customer redeemable-products read use case/read repository, preserving balance, product ordering, price parsing, redemption cost defaults, and `canRedeem` behavior before moving customer order history.

### 2026-05-07 - Phase 9 - Customer redeemable-products read-use-case slice

Status: Done

Changed:
- Moved authenticated `GET /api/customers/loyalty/redeemable` off `CustomersService.getRedeemableProducts()` and onto `GetCustomerRedeemableProductsUseCase`.
- Added `CustomerRedeemableProductsReadModel`, `CustomerRedeemableProductsReadRepository`, and `MikroOrmCustomerRedeemableProductsReadRepository`.
- Kept loyalty redemption rules in the domain policy via `LoyaltyPointsPolicy`; the use case applies redemption-cost defaults and `canRedeem` behavior.
- Preserved the legacy response fields: `balance`, `products`, and product `id`, `name`, `imageUrl`, numeric `price`, `redemptionCost`, and `canRedeem`.
- Preserved legacy product query behavior: active and redeemable products ordered by name ascending, decimal string price parsing, nullable image URL normalization, and entity/policy redemption-cost defaults.
- Added `CustomerRedeemableProductsResponseDto` and `CustomerRedeemableProductResponseDto` so the moved route has an explicit Swagger-visible response DTO without manual `@Api*` decorators.
- Updated `CustomersController.getRedeemableProducts` to call the use case, map the read model through `toCustomerRedeemableProductsResponseDto()`, and translate a missing active customer into `Cliente nao encontrado`.
- Wired `GetCustomerRedeemableProductsUseCase` and `CUSTOMER_REDEEMABLE_PRODUCTS_READ_REPOSITORY` through `CustomersModule`.
- Removed the now-unused `CustomersService.getRedeemableProducts()` method and `Product` entity import from `CustomersService`.
- Kept customer orders, loyalty transactions, loyalty adjustment, order auto-create compatibility, coupons, payments, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused redeemable-products tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/get-customer-redeemable-products.use-case.test.ts test/contexts/customers/mikro-orm-customer-redeemable-products.read-repository.test.ts test/modules/customers/customer.mapper.test.ts` - 13 tests passed after fixing the new repository test expectation to match the `Product` entity default redemption cost.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 379 tests passed.
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new redeemable-products application files, adapter, response DTO, touched controller/mapper, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched customer controller and redeemable-products response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.getRedeemableProducts()`, `customersService.getRedeemableProducts(...)`, and `ReturnType<CustomersService['getRedeemableProducts']>` are gone from customer source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/customers/loyalty/redeemable` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/customers/loyalty/redeemable` returned `401` and `{"message":"Token inválido","error":"Unauthorized","statusCode":401}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `GetCustomerRedeemableProductsUseCase` is a thin read orchestrator; loyalty redemption behavior stays in `LoyaltyPointsPolicy`.
- `MikroOrmCustomerRedeemableProductsReadRepository` is the only new redeemable-products read path that imports MikroORM or ORM entities.
- The adapter uses an active-customer lookup by id before reading products, matching the current authenticated-customer profile and loyalty read adapter pattern.
- The controller keeps the same route, guard, and legacy response keys while returning an explicit response DTO class.
- One code fix was needed during review: the new repository test expectation was updated from nullable redemption cost to the `Product` entity default of `0`, then focused tests were rerun and passed.
- No further code fixes were needed after final self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated redeemable-products read against local data to avoid exposing local customer data; use-case, adapter, and mapper tests cover success, missing-customer, null/default redemption cost, and policy branches, and route wiring/guard behavior is covered by fresh Nest boot plus the unauthenticated `401` check.
- The route still receives a MikroORM `Customer` entity from `CustomerTokenGuard`; removing that entity leak belongs with the customer authentication/token port slice.
- This read path now performs an explicit active-customer lookup inside the read adapter instead of reusing the guard-loaded entity. The extra read is acceptable for this low-volume authenticated endpoint and matches the current profile and loyalty read adapter pattern.
- Customer orders, order auto-create compatibility, and loyalty adjustment behavior still live in `CustomersService`.
- Next recommended slice is `GET /api/customers/orders` behind a customer order-history read use case/read repository, preserving pagination defaults and caps, descending order creation time, order item shape, ISO date formatting, and authenticated guard behavior.

### 2026-05-07 - Phase 9 - Customer order-history read-use-case slice

Status: Done

Changed:
- Moved authenticated `GET /api/customers/orders` off `CustomersService.getOrders()` and onto `GetCustomerOrderHistoryUseCase`.
- Added `CustomerOrderHistoryPageReadModel`, `CustomerOrderHistoryReadRepository`, and `MikroOrmCustomerOrderHistoryReadRepository`.
- Preserved the legacy response fields: `orders`, `total`, `page`, `totalPages`, and order `id`, `orderNumber`, `customerName`, `status`, `totalAmount`, `deliveryFee`, `paymentMethod`, `paymentStatus`, `deliveryType`, `scheduledFor`, `items`, and `createdAt`.
- Preserved legacy item mapping: item `id`, `productName`, numeric `unitPrice`, `quantity`, numeric `subtotal`, and legacy flat `extras` only.
- Preserved legacy query behavior: active customer lookup by authenticated customer id, order lookup by customer entity, `items` populated, `createdAt DESC` ordering, `limit`, and `(page - 1) * limit` offset.
- Kept the existing controller pagination calculation in place: default page `1`, default limit `10`, minimum `1`, and maximum limit `50`.
- Added `CustomerOrderHistoryResponseDto`, `CustomerOrderResponseDto`, `CustomerOrderItemResponseDto`, and `CustomerOrderItemExtraResponseDto` so the moved route has an explicit Swagger-visible response DTO without manual `@Api*` decorators.
- Updated `CustomersController.getOrders` to call the use case, map the read model through `toCustomerOrderHistoryResponseDto()`, and translate a missing active customer into `Cliente nao encontrado`.
- Wired `GetCustomerOrderHistoryUseCase` and `CUSTOMER_ORDER_HISTORY_READ_REPOSITORY` through `CustomersModule`; registered `Order` and `OrderItem` in the customer module composition root for this read adapter.
- Removed the now-unused `CustomersService.getOrders()` method, customer-order formatter, required-date helper, and `Order` entity import from `CustomersService`.
- Kept order creation, order status changes, loyalty adjustment, customer token guard internals, coupons, payments, frontend files, migrations, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused order-history tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/get-customer-order-history.use-case.test.ts test/contexts/customers/mikro-orm-customer-order-history.read-repository.test.ts test/modules/customers/customer.mapper.test.ts` - 15 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 385 tests passed.
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new order-history application files, adapter, response DTO, touched controller/mapper, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched customer controller and order-history response DTO returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.getOrders()`, `customersService.getOrders(...)`, and `ReturnType<CustomersService['getOrders']>` are gone from customer source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/customers/orders` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/customers/orders?page=1&limit=10` returned `401` and `{"message":"Token inválido","error":"Unauthorized","statusCode":401}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `GetCustomerOrderHistoryUseCase` is a thin read orchestrator and depends only on the customer order-history read repository port.
- `MikroOrmCustomerOrderHistoryReadRepository` is the only new customer order-history read path that imports MikroORM or ORM entities.
- The adapter uses an active-customer lookup by id before reading orders, matching the current authenticated-customer profile, loyalty, and redeemable-products read adapter pattern.
- The controller keeps the same route, guard, query parsing, pagination bounds, and legacy response keys while returning an explicit response DTO class.
- The customer response intentionally remains narrower than admin/order read models: no `customerPhone`, `deliveryAddress`, `notes`, `updatedAt`, `itemCount`, or `groupedExtras` were added to this customer endpoint.
- No code fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated order-history read against local data to avoid exposing local customer/order data; use-case, adapter, and mapper tests cover success, missing-customer, pagination, default pickup fields, missing extras, and response mapping, and route wiring/guard behavior is covered by fresh Nest boot plus the unauthenticated `401` check.
- The route still receives a MikroORM `Customer` entity from `CustomerTokenGuard`; removing that entity leak belongs with the customer authentication/token port slice.
- This read path now performs an explicit active-customer lookup inside the read adapter instead of reusing the guard-loaded entity. The extra read is acceptable for this low-volume authenticated endpoint and matches the current profile, loyalty, and redeemable-products read adapter pattern.
- Loyalty adjustment behavior still lives in `CustomersService`; `findByToken` and `findOrCreateByPhone` also remain in that legacy service but appear unused by current source after previous order/customer slices.
- Next recommended slice is `POST /api/admin/loyalty/adjust` behind an admin customer loyalty adjustment use case/write repository, preserving the current balance update SQL guard, transaction row creation, default descriptions, response shape, and admin route behavior.

### 2026-05-07 - Phase 9 - Admin customer loyalty adjustment use-case slice

Status: Done

Changed:
- Moved admin `POST /api/admin/loyalty/adjust` off `CustomersService.adjustPoints()` and onto `AdjustCustomerLoyaltyUseCase`.
- Added `CustomerLoyaltyAdjustmentRepository`, adjustment command/result models, `CustomerLoyaltyAdjustmentRejectedError`, and `MikroOrmCustomerLoyaltyAdjustmentRepository`.
- Kept the write transaction boundary owned by the use case through `MikroOrmUnitOfWork`; the adapter participates in the provided transaction context.
- Kept loyalty adjustment business rules in `LoyaltyPointsPolicy`: pre-check balance, reject negative results, and provide default manual adjustment descriptions.
- Preserved legacy customer lookup behavior by customer id without adding an `isActive` filter in this admin-only adjustment path.
- Preserved the legacy raw SQL balance guard, loyalty transaction row creation, flush behavior, adjustment log, and response shape with `balance` and `transaction.id`, `transaction.points`, and `transaction.type`.
- Added `AdjustCustomerLoyaltyDto`, `AdjustCustomerLoyaltyResponseDto`, and nested transaction response DTO so the moved route has Swagger-visible request/response contracts without manual `@Api*` decorators.
- Updated `AdminController.adjustLoyalty` to call the use case, map through `toAdjustCustomerLoyaltyResponseDto()`, and translate application errors into the existing not-found and bad-request HTTP behavior.
- Wired `AdjustCustomerLoyaltyUseCase` and `CUSTOMER_LOYALTY_ADJUSTMENT_REPOSITORY` through `CustomersModule`.
- Removed the now-unused `CustomersService.adjustPoints()` method and stale loyalty-adjustment imports from `CustomersService`.
- Kept customer token guard internals, order creation/customer auto-create, order status changes, coupons, payments, uploads, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused loyalty-adjustment tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/adjust-customer-loyalty.use-case.test.ts test/contexts/customers/mikro-orm-customer-loyalty-adjustment.repository.test.ts test/modules/admin/admin-customer.mapper.test.ts` - 11 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 395 tests passed.
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new adjustment application files, adapter, admin DTOs, touched controller/mapper/module/service, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched admin controller and adjustment request/response DTOs returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CustomersService.adjustPoints()`, `customersService.adjustPoints(...)`, and `ReturnType<CustomersService['adjustPoints']>` are gone from customer/admin source.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/admin/loyalty/adjust` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/admin/loyalty/adjust` returned `401` and `{"message":"Unauthorized","statusCode":401}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after stopping the dev server, followed by cleanup of stale local API watch processes.

Self-review:
- `AdjustCustomerLoyaltyUseCase` is a thin write orchestrator: open the unit of work, load the target, delegate loyalty adjustment decisions to `LoyaltyPointsPolicy`, call the adjustment port, and translate repository guard failures into application errors.
- `MikroOrmCustomerLoyaltyAdjustmentRepository` is the only new loyalty-adjustment path that imports Nest logging, MikroORM transaction context, ORM entities, or raw SQL.
- The adapter deliberately preserves the legacy admin lookup behavior and SQL balance guard rather than introducing new active-customer filtering or a different points-update mechanism in this slice.
- The controller keeps the same admin route, guard, request keys, response keys, and HTTP error behavior while returning explicit Swagger DTO classes.
- No code fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated live loyalty adjustment against local data to avoid mutating a real local customer balance; use-case, adapter, and mapper tests cover success, missing customer, policy rejection, SQL guard rejection, default descriptions, transaction row creation, and response mapping.
- `AdjustCustomerLoyaltyDto` now makes the numeric `points` request contract explicit through class-validator and Swagger DTO metadata. Clients sending string points would now be rejected earlier by validation instead of relying on legacy runtime coercion.
- `CustomersService` now appears unused except for `CustomersModule` provider/export references; removing it belongs in the next cleanup slice.
- The customer token guard still exposes a MikroORM `Customer` entity to customer routes; removing that entity leak belongs with the customer authentication/token port slice.
- Next recommended slice is Phase 10 cleanup of the now-unused `CustomersService` provider/export and service file, followed by the customer token guard port slice.

### 2026-05-07 - Phase 10 - CustomersService cleanup slice

Status: Done

Changed:
- Removed the unused `CustomersService` provider from `CustomersModule`.
- Removed the unused `CustomersService` export from `CustomersModule`.
- Deleted `apps/api/src/modules/customers/customers.service.ts` after confirming source/test callers were gone.
- Kept `CustomerTokenGuard`, customer controllers, customer DTOs, route contracts, order customer auto-create adapter behavior, coupons, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Source/test stale-reference scan: `rg -n "CustomersService|customers.service|findByToken|findOrCreateByPhone" apps/api/src apps/api/test` returned no matches.
- `git diff --check`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 395 tests passed.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `CustomersModule` successfully and mapped the existing customer routes.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/customers/me` returned `401` and `{"message":"Token inválido","error":"Unauthorized","statusCode":401}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- The deleted service contained only two stale helpers: customer-token lookup and order customer find-or-create compatibility.
- Customer-token lookup is currently owned by `CustomerTokenGuard`; replacing its entity leak remains a separate slice.
- Order customer find-or-create behavior is already owned by `MikroOrmOrderCustomerRepository`, and source scans confirm no remaining order code depends on `CustomersService`.
- Removing the provider/export is a module composition cleanup only; no route contract or controller behavior changed.
- No code fixes were needed after self-review; stale-reference scans, API/web typechecks, API build, full API unit tests, whitespace check, fresh boot, smoke, and route checks all passed.

Risks:
- This slice deliberately did not change `CustomerTokenGuard`, so authenticated customer routes still receive a MikroORM `Customer` entity on the request object.
- The deleted service name still appears in historical plan entries, but no source/test references remain.
- Next recommended slice is the customer token guard port slice: move token validation behind a customer application port/read adapter and update the customer request surface without changing authenticated route behavior.

### 2026-05-07 - Phase 10 - Customer token guard port slice

Status: Done

Changed:
- Moved active customer token lookup out of `CustomerTokenGuard` and behind `AuthenticateCustomerTokenUseCase`.
- Added `CustomerToken` value object to own UUID token format validation without normalizing token case.
- Added `AuthenticatedCustomerReadModel`, `CustomerTokenAuthRepository`, and `MikroOrmCustomerTokenAuthRepository`.
- Updated `CustomerTokenGuard` to inject the use case, reject missing/malformed/unresolved tokens with the existing `Token inválido` behavior, and attach only an authenticated customer read model to the request.
- Updated `CustomersController` request typing to use `AuthenticatedCustomerRequest` instead of the MikroORM `Customer` entity.
- Wired `CUSTOMER_TOKEN_AUTH_REPOSITORY` and `AuthenticateCustomerTokenUseCase` through `CustomersModule`.
- Kept customer route paths, customer DTO shapes, response DTOs, order customer auto-create behavior, coupons, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused token-boundary tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/customers/customer-token.value-object.test.ts test/contexts/customers/authenticate-customer-token.use-case.test.ts test/contexts/customers/mikro-orm-customer-token-auth.repository.test.ts test/modules/customers/customer-token.guard.test.ts` - 12 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 407 tests passed.
- Customers domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new token value object, application files, adapter, request type, guard, controller/module changes, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger/controller scan over the touched customer controller/request/guard surface returned no `import type` in the controller surface, no manual `@Api*` decorators, and no customer entity import.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `CustomersModule` successfully and mapped all existing customer routes.
- `pnpm smoke:api`
- Local route checks for `GET /api/customers/me` returned `401` and `{"message":"Token inválido","error":"Unauthorized","statusCode":401}` for missing token, malformed token, and a valid-format unknown UUID token.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- `CustomerTokenGuard` is now an HTTP adapter only: it reads the header, delegates token validation/authentication to the use case, maps null to the existing unauthorized exception, and writes the authenticated read model onto the request.
- `AuthenticateCustomerTokenUseCase` is a thin application boundary and depends only on the customer token auth port plus the `CustomerToken` value object.
- `MikroOrmCustomerTokenAuthRepository` is the only new token-auth path that imports MikroORM or ORM entities, and it preserves the active-customer lookup shape `{ token, isActive: true }`.
- `CustomersController` no longer imports the ORM `Customer` entity and still passes only `req.customer.id` to authenticated customer use cases.
- No code fixes were needed after self-review beyond replacing a type-only request import so the touched controller/request surface stays Swagger-plugin friendly; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger/controller scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated live customer route with a real local token to avoid exposing local customer data; focused guard/use-case/adapter tests cover successful attachment of the authenticated read model and not-found behavior, while fresh boot and curl checks cover route wiring and unauthorized responses.
- Duplicate or array-form `x-customer-token` headers are rejected before the use case. Normal single-header token behavior is preserved.
- Next recommended slice is to re-read the guides and inspect the remaining Phase 9 coupon surface, because coupons still validate preview and order creation through legacy service logic.

### 2026-05-07 - Phase 9 - Public coupon validation use-case slice

Status: Done

Changed:
- Moved public `POST /api/coupons/validate` off direct `CouponsService` validation logic and onto `ValidateCouponUseCase`.
- Added `CouponEligibilityPolicy` for eligible amount assembly across product/category restrictions, promotional exclusion, flat extras, and grouped options.
- Added coupon validation read models, `CouponValidationReadRepository`, `ValidateCouponUseCase`, and `MikroOrmCouponValidationReadRepository`.
- Kept the existing `CouponApplicabilityPolicy` responsible for active/date/time/delivery/usage/customer/minimum/discount rules.
- Kept `CouponsService.validateAndCalculate()` as a delegating compatibility method for `LegacyCouponsServiceOrderCouponValidator`.
- Added `ValidateCouponResponseDto`, nested coupon response DTO, and `toValidateCouponResponseDto()` so the public route has an explicit Swagger-visible response DTO without manual `@Api*` decorators.
- Updated `ValidateCouponDto` field style and JSDoc only; no new public request fields were added.
- Updated `CouponsController.validate` to call the use case directly, map through the coupon mapper, and return `Promise<ValidateCouponResponseDto>`.
- Wired `COUPON_VALIDATION_READ_REPOSITORY` and `ValidateCouponUseCase` through `CouponsModule`.
- Kept admin coupon CRUD behavior, order module wiring, coupon usage incrementing, order creation, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused coupon-validation tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/coupons/coupon-eligibility.policy.test.ts test/contexts/coupons/validate-coupon.use-case.test.ts test/contexts/coupons/mikro-orm-coupon-validation.read-repository.test.ts test/modules/coupons/coupon.mapper.test.ts test/contexts/orders/legacy-coupons-service-order-coupon.validator.test.ts` - 14 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 419 tests passed.
- Coupons domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new coupon validation domain/application files, adapter, response DTO, touched controller/mapper/service/module, and focused tests returned no `any`, non-null assertions, or definite assignment assertions.
- Swagger scan over the touched coupon controller and validate request/response DTOs returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed public `CouponsController.validate` now calls `ValidateCouponUseCase`; `CouponsService.validateAndCalculate()` remains only as the order-coupon compatibility facade.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot mapped `/api/coupons/validate` `POST`.
- `pnpm smoke:api`
- Local missing-coupon route check for `POST /api/coupons/validate` returned `201` and `{"valid":false,"reason":"Cupom não encontrado ou inativo"}`, preserving Nest's existing POST default status while preserving the legacy body.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- `ValidateCouponUseCase` is a thin application orchestrator: normalize code, load coupon, delegate coupon use/customer/order rules to `CouponApplicabilityPolicy`, load read models through the coupon validation port, delegate eligible amount assembly to `CouponEligibilityPolicy`, and return the legacy-shaped result.
- `CouponEligibilityPolicy` owns product/category/promotion/extras/options eligibility calculations instead of leaving that business rule inside a controller or service method.
- `MikroOrmCouponValidationReadRepository` is the only new coupon validation path that imports MikroORM, ORM entities, or `ProductPricePolicy`.
- The public controller keeps the same route and request body shape while returning an explicit response DTO class and avoiding manual Swagger decorators.
- `CouponsService.validateAndCalculate()` deliberately remains as a compatibility facade for order creation until the order coupon bridge is replaced in a later slice.
- Code fixes made during review: tightened fake adapter test narrowing and aligned nullable date expectations with the read model output, then reran focused checks.
- No further code fixes were needed after final self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute a successful live valid-coupon request against local data to avoid relying on mutable local coupon/product fixtures; use-case, policy, adapter, mapper, and legacy order-bridge tests cover success and rejection paths, and fresh boot plus curl cover route wiring.
- `ValidateCouponDto` still omits `optionSelections`, intentionally preserving the existing public route contract and whitelist behavior; order creation compatibility still supports option selections through the service/use-case command.
- `CouponsService` still hosts admin coupon CRUD plus the order-coupon compatibility facade. Removing the facade belongs with the order coupon bridge cleanup slice, and admin coupon CRUD migration belongs in separate admin coupon slices.
- Next recommended slice is to re-read the guides and inspect the order coupon bridge cleanup or admin coupon CRUD surface, selecting the narrower path that reduces legacy service coupling without changing order creation behavior.

### 2026-05-07 - Phase 10 - Order coupon bridge cleanup slice

Status: Done

Changed:
- Replaced `LegacyCouponsServiceOrderCouponValidator` with `ValidateCouponUseCaseOrderCouponValidator`.
- Moved the order coupon adapter out of the persistence folder and into `apps/api/src/contexts/orders/adapters/coupons/` because it now bridges to coupon validation application behavior rather than persistence or a legacy service.
- Updated the order coupon adapter to call `ValidateCouponUseCase.execute()` directly and map the result into the existing `OrderCouponValidator` port shape.
- Preserved the order coupon validation mapping: coupon `id`/`code`, `discountCents` from rounded calculated discount cents, and fixed two-decimal `discountAmount`.
- Updated `OrdersModule` to inject exported `ValidateCouponUseCase` from `CouponsModule` for `ORDER_COUPON_VALIDATOR`.
- Removed the temporary `CouponsService.validateAndCalculate()` facade, its use-case dependency, and its validation imports.
- Stopped exporting `CouponsService` from `CouponsModule`; the service remains an internal provider for admin coupon CRUD only.
- Replaced the legacy bridge test with a direct use-case bridge test covering success, rejection, item copying, flat extras, and grouped options.
- Kept admin coupon CRUD behavior, public coupon validation route behavior, order creation logic, coupon usage incrementing, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused order/coupon bridge tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/orders/validate-coupon-use-case-order-coupon.validator.test.ts test/contexts/orders/create-order.use-case.test.ts test/contexts/coupons/validate-coupon.use-case.test.ts` - 9 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 419 tests passed.
- Orders/coupons domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new bridge adapter, bridge test, touched orders module, and touched coupons service/module returned no `any`, non-null assertions, or manual dependency field assignment boilerplate.
- Stale-reference scans confirmed `legacy-coupons-service`, `LegacyCouponsServiceOrderCouponValidator`, `LegacyCouponValidation*`, `validateAndCalculate`, and order-module `CouponsService` injection are gone from source/tests.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `OrdersModule` and mapped `/api/orders` `POST` plus `/api/coupons/validate` `POST`.
- `pnpm smoke:api`
- Local invalid-order route check for `POST /api/orders` returned `400`, confirming order route validation still resolves.
- Local missing-coupon route check for `POST /api/coupons/validate` returned `201` and `{"valid":false,"reason":"Cupom não encontrado ou inativo"}`, confirming public coupon route behavior still resolves.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.
- Post-review type-only fix rerun: focused 9 tests, `pnpm --filter api exec tsc --noEmit --pretty false`, `git diff --check`, `pnpm --filter api build`, strictness scan, and stale coupon-bridge scan all passed.

Self-review:
- `ValidateCouponUseCaseOrderCouponValidator` is an adapter only: it translates the order coupon port command into the coupon validation use-case command and translates the result back into the order coupon port result.
- Order creation still depends on `ORDER_COUPON_VALIDATOR`; it does not import coupon modules or use cases directly.
- `CouponsService` no longer knows public validation behavior and is no longer exported from `CouponsModule`.
- The cross-context dependency is held in a Nest/module adapter boundary, not in order domain/application code.
- Code fix made during review: changed the bridge adapter item-mapping return type to `ValidateCouponItemCommand[]` so the adapter explicitly maps into the coupon use-case contract, then reran focused tests/typecheck/build/scans.
- No further code fixes were needed after the final self-review.

Risks:
- This slice did not execute a successful live order with a real valid coupon to avoid relying on mutable local coupon/product fixtures and creating local order data; bridge, coupon use-case, order use-case, and coupon usage tests cover success/rejection and order integration behavior.
- `CouponsService` still contains legacy admin coupon CRUD and should be migrated in separate admin coupon CRUD slices with Swagger-visible response DTOs and focused admin route checks.
- `OrdersModule` still has another legacy bridge to `StoreService` for store availability; that belongs to a later store/order cleanup slice.
- Next recommended slice is to re-read the guides and inspect admin coupon CRUD, starting with the smallest read-only route or response DTO boundary before attempting coupon write flows.

### 2026-05-07 - Phase 10 - Admin coupon list read-use-case slice

Status: Done

Changed:
- Moved admin `GET /api/admin/coupons` off `CouponsService.listAll()` and onto `ListAdminCouponsUseCase`.
- Added `AdminCouponReadModel`, `AdminCouponReadRepository`, and `MikroOrmAdminCouponReadRepository`.
- Preserved the legacy list query behavior: all coupons ordered by `createdAt DESC`.
- Preserved the legacy response fields and formatting: numeric decimal fields, ISO date strings, nullable optional restrictions, array restriction fields, usage counters, active flag, and created/updated timestamps.
- Added `AdminCouponResponseDto` so the moved route has an explicit Swagger-visible response DTO without manual `@Api*` decorators.
- Added `toAdminCouponResponseDtos()` to the coupon mapper and updated `AdminCouponsController.listAll` to call the use case and return `Promise<AdminCouponResponseDto[]>`.
- Wired `ADMIN_COUPON_READ_REPOSITORY` and `ListAdminCouponsUseCase` through `CouponsModule`.
- Removed only `CouponsService.listAll()`; `CouponsService` remains an internal admin coupon create/update/toggle provider.
- Kept admin coupon create/update/delete behavior, coupon request DTOs, public coupon validation, order creation, coupon usage, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of this slice.

Verified:
- Focused admin coupon list tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/coupons/list-admin-coupons.use-case.test.ts test/contexts/coupons/mikro-orm-admin-coupon.read-repository.test.ts test/modules/coupons/coupon.mapper.test.ts` - 5 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 422 tests passed.
- Coupons domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new admin coupon read application files, adapter, response DTO, touched controller/mapper/module/service, and focused tests returned no `any`, non-null assertions, or manual dependency field assignment boilerplate.
- Swagger scan over the touched coupon controller and `AdminCouponResponseDto` returned no `import type` in the controller/DTO surface and no manual `@Api*` decorators.
- Stale-reference scans confirmed `CouponsService.listAll()` and `this.service.listAll()` are gone from the coupon module surface.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `CouponsModule` and mapped `/api/admin/coupons` `GET`.
- `pnpm smoke:api`
- Local unauthenticated route check for `GET /api/admin/coupons` returned `401` and `{"message":"Unauthorized","statusCode":401}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- `ListAdminCouponsUseCase` is a thin read orchestrator and depends only on the admin coupon read repository port.
- `MikroOrmAdminCouponReadRepository` is the only new admin coupon list read path that imports MikroORM or ORM entities.
- The controller keeps the same admin route and guard while returning an explicit response DTO class.
- The mapper copies array fields so DTO consumers cannot mutate read-model arrays by reference.
- No code fixes were needed after self-review; focused tests, API/web typechecks, full API unit tests, API build, whitespace check, dependency scans, strictness scans, Swagger scan, stale-reference scans, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated live admin coupon list against local data to avoid exposing local coupon configuration; use-case, adapter, and mapper tests cover successful read behavior and response shape, and fresh boot plus unauthenticated `401` cover route wiring and guard behavior.
- `CouponsService` still contains legacy admin coupon create/update/toggle behavior; those write routes need separate slices with explicit transaction boundaries and response DTOs.
- `CreateCouponDto` and `UpdateCouponDto` still use legacy request DTO style and enum validation patterns; they should be cleaned when their write routes move.
- Next recommended slice is to re-read the guides and move `POST /api/admin/coupons` behind a create-admin-coupon use case/write repository, preserving duplicate-code checks, uppercase code normalization, decimal formatting, defaults, and response shape.

### 2026-05-07 - Phase 10 - Admin coupon create use-case slice

Status: Done

Changed:
- Moved admin `POST /api/admin/coupons` off `CouponsService.create()` and onto `CreateAdminCouponUseCase`.
- Added `CouponCreationDraft` value object for uppercase code normalization, money string formatting, date conversion, defensive array copying, current-use/default values, and active/default boolean behavior.
- Added `AdminCouponWriteRepository`, `AdminCouponDuplicateCodeError`, and `MikroOrmAdminCouponWriteRepository`.
- Kept the write transaction boundary owned by the use case through `MikroOrmUnitOfWork`; the persistence adapter participates in the provided transaction context.
- Extracted shared `toAdminCouponReadModel()` persistence mapper and reused it in admin coupon read/write adapters.
- Preserved legacy duplicate-code check/message, create payload formatting, default values, flush behavior, and response shape.
- Updated `CreateCouponDto` to Swagger/OOP strict style: real `CouponDiscountTypeDto` enum with `@IsEnum`, `declare public readonly` required fields, public optional readonly fields, JSDoc descriptions, no `@IsIn`, and no definite assignment assertions.
- Updated `AdminCouponsController.create` to call the use case, return `Promise<AdminCouponResponseDto>`, map duplicate-code application errors to `BadRequestException('Já existe um cupom com este código')`, and map the read model through `toAdminCouponResponseDto`.
- Wired `ADMIN_COUPON_WRITE_REPOSITORY`, `MikroOrmUnitOfWork`, and `CreateAdminCouponUseCase` through `CouponsModule`.
- Removed only `CouponsService.create()`; update/toggle behavior remains for later slices.
- Kept admin coupon update/delete behavior, public coupon validation, order creation, coupon usage, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of scope.

Verified:
- Focused admin coupon create tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/coupons/coupon-creation-draft.value-object.test.ts test/contexts/coupons/create-admin-coupon.use-case.test.ts test/contexts/coupons/mikro-orm-admin-coupon-write.repository.test.ts test/contexts/coupons/mikro-orm-admin-coupon.read-repository.test.ts test/modules/coupons/coupon.mapper.test.ts` - 10 tests passed after review.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 428 tests passed.
- Coupons domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new admin coupon create domain/application files, adapters, create DTO, touched controller/mapper/module/service, and focused tests returned no `any`, non-null assertions, definite assignment assertions, or manual dependency field assignment boilerplate.
- Swagger scan over the touched coupon controller and create/admin response DTOs returned no `import type` in the controller/DTO surface, no manual `@Api*` decorators, and no `@IsIn`.
- Stale-reference scans confirmed `CouponsService.create()` and `this.service.create()` are gone from the coupon module surface.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `CouponsModule` and mapped `/api/admin/coupons` `POST`.
- `pnpm smoke:api`
- Local unauthenticated route check for `POST /api/admin/coupons` returned `401` and `{"message":"Unauthorized","statusCode":401}`.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- `CreateAdminCouponUseCase` is a thin application orchestrator: it builds a domain draft, opens the unit-of-work boundary, calls the write repository port, maps duplicate-code repository results to an application error, and returns the read model.
- `CouponCreationDraft` owns the legacy creation normalization/default rules instead of leaving them in the controller or service.
- `MikroOrmAdminCouponWriteRepository` is the only new create path that imports MikroORM transaction context helpers or ORM entities.
- The persistence adapter does not start a nested transaction; it uses the transaction context supplied by the use case and flushes through that context, matching existing write-adapter behavior.
- The controller keeps the same admin route and guard while returning an explicit response DTO class and preserving the legacy duplicate-code HTTP message.
- Code fix made during review: wrapped a long type-only import in the write adapter, then reran focused tests, API typecheck, whitespace check, dependency scan, strictness scan, Swagger scan, and stale-reference scan.
- No behavioral code fixes were needed after final self-review.

Risks:
- This slice did not execute an authenticated live admin coupon create against local data to avoid mutating local coupon data; use-case, value-object, adapter, mapper, and route-guard checks cover creation, duplicate-code, defaults, transaction context, response shape, and route wiring.
- `CouponsService` still contains legacy admin coupon update/toggle behavior; those write routes need separate slices with explicit transaction boundaries and response DTOs.
- `UpdateCouponDto` still uses legacy request DTO style and enum validation patterns; it should be cleaned when the update route moves.
- `CreateCouponDto` now documents discount type as a real enum while still accepting the same wire strings: `percentage` and `fixed`.
- Next recommended slice is to re-read the guides and move the smallest remaining admin coupon write route, likely `DELETE /api/admin/coupons/:id` toggle-active behavior or `PUT /api/admin/coupons/:id` update, preserving legacy behavior and route shape.

### 2026-05-07 - Phase 10 - Admin coupon toggle-active use-case slice

Status: Done

Changed:
- Moved admin `DELETE /api/admin/coupons/:id` toggle-active behavior off `CouponsService.toggleActive()` and onto `ToggleAdminCouponActiveUseCase`.
- Extended `AdminCouponWriteRepository` with `toggleActive(id, context)` and a typed not-found/update result.
- Added `AdminCouponNotFoundError` for application-layer missing-coupon translation.
- Updated `MikroOrmAdminCouponWriteRepository` to toggle `Coupon.isActive` through the provided transaction context, flush once on success, skip flushing when missing, and return the shared admin coupon read model.
- Updated `AdminCouponsController.toggleActive` to call the use case, return `Promise<AdminCouponResponseDto>`, map missing coupons to `NotFoundException('Cupom não encontrado')`, and preserve the existing admin route/guard.
- Wired `ToggleAdminCouponActiveUseCase` through `CouponsModule`.
- Removed only `CouponsService.toggleActive()`; `CouponsService.update()` remains for the later update slice.
- Kept admin coupon update behavior, `UpdateCouponDto`, public coupon validation, order coupon behavior, coupon usage, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of scope.

Verified:
- Focused admin coupon toggle/create tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/coupons/toggle-admin-coupon-active.use-case.test.ts test/contexts/coupons/create-admin-coupon.use-case.test.ts test/contexts/coupons/mikro-orm-admin-coupon-write.repository.test.ts test/modules/coupons/coupon.mapper.test.ts` - 11 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 432 tests passed.
- Coupons domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new toggle use case, admin coupon write port/adapter, touched controller/module/service, and focused tests returned no `any`, non-null assertions, definite assignment assertions, or manual dependency field assignment boilerplate.
- Swagger scan over the touched coupon controller and coupon response/create DTOs returned no `import type` in the controller/DTO surface, no manual `@Api*` decorators, and no `@IsIn`.
- Stale-reference scans confirmed `CouponsService.toggleActive()`, `this.service.toggleActive`, and `service.toggleActive(...)` are gone from the coupon module/test surface.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `CouponsModule` and mapped `/api/admin/coupons/:id` `DELETE`.
- `pnpm smoke:api`
- Local unauthenticated route check for `DELETE /api/admin/coupons/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local coupon data.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- `ToggleAdminCouponActiveUseCase` is a thin write orchestrator: it opens the unit-of-work boundary, calls the admin coupon write repository port, translates missing results into an application error, and returns the read model.
- `MikroOrmAdminCouponWriteRepository` remains the only new toggle path that imports MikroORM transaction context helpers or ORM entities.
- The adapter preserves legacy toggle behavior: flip the current `isActive` value, flush once on success, and avoid flushing when the coupon is missing.
- The controller keeps the same admin route and guard while returning an explicit response DTO and preserving the legacy missing-coupon HTTP message.
- No code fixes were needed after self-review; focused tests, API/web typechecks, API build, full API unit tests, whitespace check, dependency scans, strictness scan, Swagger scan, stale-reference scan, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated live admin coupon toggle against local data to avoid mutating local coupon state; use-case, adapter, and mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the unauthenticated `401` check.
- `CouponsService` still contains legacy admin coupon update behavior and its formatter; the update route needs its own write use case and DTO cleanup slice.
- `UpdateCouponDto` still uses legacy request DTO style and `@IsIn`; it should be cleaned when `PUT /api/admin/coupons/:id` moves.
- Next recommended slice is to re-read the guides and move `PUT /api/admin/coupons/:id` behind `UpdateAdminCouponUseCase`, preserving partial update semantics, duplicate-code checks, nullable field clearing, `Cupom não encontrado`, `Já existe um cupom com este código`, and response shape.

### 2026-05-07 - Phase 10 - Admin coupon update use-case slice

Status: Done

Changed:
- Moved admin `PUT /api/admin/coupons/:id` off `CouponsService.update()` and onto `UpdateAdminCouponUseCase`.
- Added `CouponUpdatePatch` value object for uppercase code normalization, money string formatting, date conversion, defensive array copying, present-field tracking, and nullable field clearing.
- Extended `AdminCouponWriteRepository` with `update(id, patch, context)` and typed updated/not-found/duplicate-code outcomes.
- Updated `MikroOrmAdminCouponWriteRepository` to apply only present fields through the provided transaction context, preserve the duplicate-code check with `{ id: { $ne: id } }`, flush once on success, skip flushing on not-found/duplicate-code outcomes, and map through the shared read-model mapper.
- Updated `UpdateCouponDto` to Swagger/OOP strict style: `CouponDiscountTypeDto` real enum with `@IsEnum`, public readonly fields, JSDoc descriptions, no `@IsIn`, and no definite assignment assertions.
- Updated `AdminCouponsController.update` to call the use case, return `Promise<AdminCouponResponseDto>`, map `AdminCouponNotFoundError` to `NotFoundException('Cupom não encontrado')`, map duplicate code to `BadRequestException('Já existe um cupom com este código')`, and preserve the existing admin route/guard.
- Wired `UpdateAdminCouponUseCase` through `CouponsModule`.
- Removed the final `CouponsService` provider/import and deleted `apps/api/src/modules/coupons/coupons.service.ts`.
- Kept public coupon validation, order coupon behavior, coupon usage, payments, migrations, frontend files, deploy files, commits, pushes, and deployment out of scope.

Verified:
- Focused admin coupon update/create/toggle tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/coupons/coupon-update-patch.value-object.test.ts test/contexts/coupons/update-admin-coupon.use-case.test.ts test/contexts/coupons/toggle-admin-coupon-active.use-case.test.ts test/contexts/coupons/create-admin-coupon.use-case.test.ts test/contexts/coupons/mikro-orm-admin-coupon-write.repository.test.ts test/contexts/coupons/mikro-orm-admin-coupon.read-repository.test.ts test/modules/coupons/coupon.mapper.test.ts` - 20 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 440 tests passed.
- Coupons domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new update value object/use case, write port/adapter, touched controller/module/DTO, and focused tests returned no `any`, non-null assertions, definite assignment assertions, or manual dependency field assignment boilerplate.
- Swagger scan over the touched coupon controller and create/update/admin response DTOs returned no `import type` in the controller/DTO surface, no manual `@Api*` decorators, and no `@IsIn`.
- Stale-reference scans confirmed `CouponsService`, `coupons.service`, `this.service`, and legacy coupon service route calls are gone from the coupon source/test surface.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `CouponsModule` and mapped `/api/admin/coupons/:id` `PUT`.
- `pnpm smoke:api`
- Local unauthenticated route check for `PUT /api/admin/coupons/00000000-0000-4000-8000-000000000000` returned `401` and `{"message":"Unauthorized","statusCode":401}` without mutating local coupon data.
- Local public route check for `GET /api/store/status` returned `200`, confirming unrelated public API wiring still resolves.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- `UpdateAdminCouponUseCase` is a thin write orchestrator: it builds a domain patch, opens the unit-of-work boundary, calls the admin coupon write repository port, translates missing/duplicate outcomes into application errors, and returns the read model.
- `CouponUpdatePatch` owns update normalization, present-field tracking, defensive array copying, and nullable field clearing instead of leaving those rules in the controller or persistence adapter.
- `MikroOrmAdminCouponWriteRepository` is the only update path that imports MikroORM transaction context helpers or ORM entities, uses the transaction context supplied by the use case, and does not start nested transactions.
- The adapter checks duplicate normalized codes before mutating the coupon and skips flushing on duplicate or missing coupons.
- The controller keeps the same admin route and guard while returning an explicit response DTO and preserving the legacy not-found and duplicate-code HTTP messages.
- No code fixes were needed after self-review; focused tests, API/web typechecks, API build, full API unit tests, whitespace check, dependency scans, strictness scan, Swagger scan, stale-reference scan, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute an authenticated live admin coupon update against local data to avoid mutating local coupon state; use-case, value-object, adapter, and mapper behavior is covered by focused tests, and route wiring/guard behavior is covered by fresh Nest boot plus the unauthenticated `401` check.
- `CouponUpdatePatch` preserves the route-validation assumption for invalid date strings; HTTP input validation remains owned by `UpdateCouponDto`.
- Admin coupon list/create/update/toggle behavior is now moved off `CouponsService`; the next recommended slice is to re-read the guides and inspect remaining Phase 10 legacy bridges/services before choosing the smallest cleanup boundary.

### 2026-05-07 - Phase 10 - Dead public menu services cleanup slice

Status: Done

Changed:
- Removed unused `ProductsService` from `ProductsModule` providers/exports and deleted `apps/api/src/modules/products/products.service.ts`.
- Removed unused `SectionsService` from `SectionsModule` providers/exports and deleted `apps/api/src/modules/sections/sections.service.ts`.
- Preserved public menu/featured/product lookup routes through `GetPublicMenuUseCase`, `GetFeaturedProductsUseCase`, and `GetProductsByIdsUseCase`.
- Preserved public sections route through `GetPublicSectionsUseCase`.
- Kept controllers, DTOs, route contracts, domain/application behavior, order/payment/customer/coupon logic, migrations, frontend files, deploy files, commits, pushes, and deployment out of scope.

Verified:
- Initial stale focused command used obsolete adapter test filenames and failed before running behavior tests; corrected the file list from `rg --files` and reran the focused checks.
- Focused menu/section tests: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/menu/get-public-menu.use-case.test.ts test/contexts/menu/get-public-sections.use-case.test.ts test/contexts/menu/menu-availability.policy.test.ts test/contexts/menu/product-price.policy.test.ts test/modules/sections/section.mapper.test.ts` - 19 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 440 tests passed.
- Strictness scan over touched module files returned no `any`, non-null assertions, or manual dependency field assignment boilerplate.
- Stale-reference scan confirmed `ProductsService`, `products.service`, `SectionsService`, and `sections.service` are gone from source/tests.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `ProductsModule` and `SectionsModule`, mapped `/api/menu`, `/api/menu/featured`, `/api/menu/products`, and `/api/menu/sections`.
- `pnpm smoke:api`
- Local route checks returned `GET /api/menu 200`, `GET /api/menu/sections 200`, and `GET /api/store/status 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- The deleted service methods were already replaced by menu read repositories/use cases before this slice; controllers were already injecting those use cases directly.
- `ProductsModule` still exports the public menu use cases, and `SectionsModule` still exports `GetPublicSectionsUseCase`.
- No route contracts or controller signatures changed, so Swagger DTO/controller rules were not affected.
- No code fixes were needed after self-review; focused tests, API/web typechecks, API build, full API unit tests, whitespace check, strictness scan, stale-reference scan, fresh boot, smoke, and route checks all passed.

Risks:
- This cleanup did not compare full response payloads live; existing use-case, policy, mapper, full API suite, smoke, and fresh route checks cover behavior and wiring.
- `StoreService` remains for store routes and order store-availability compatibility.
- `DeliveryAreasService.findById()` and the order store-availability legacy bridge remain tracked cleanup surfaces.
- Next recommended slice is to re-read the guides and inspect the remaining `OrdersModule` legacy store-availability bridge or the remaining delivery/order compatibility service before changing either path.

### 2026-05-07 - Phase 10 - Order store-availability bridge cleanup slice

Status: Done

Changed:
- Replaced `LegacyStoreServiceOrderStoreAvailabilityChecker` with `GetStoreStatusUseCaseOrderStoreAvailabilityChecker`.
- Renamed the focused adapter test to match the new bridge and updated it to fake the public store-status `execute()` contract.
- Updated `OrdersModule` to inject exported `GetStoreStatusUseCase` for `ORDER_STORE_AVAILABILITY_CHECKER` instead of injecting `StoreService`.
- Preserved immediate order availability behavior by calling `getStoreStatusUseCase.execute()` with no command.
- Preserved scheduled order availability behavior by calling `getStoreStatusUseCase.execute({ at: scheduledFor, ignoreForceOpen: true })`.
- Kept order creation logic, store domain rules, controllers, DTOs, payments, coupons, delivery areas, migrations, frontend files, deploy files, commits, pushes, and deployment out of scope.

Verified:
- Focused order/store checks: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/orders/get-store-status-use-case-order-store-availability.checker.test.ts test/contexts/orders/create-order.use-case.test.ts test/contexts/store/get-store-status.use-case.test.ts test/contexts/store/store-availability.policy.test.ts test/contexts/store/store-service-adapter.test.ts` - 17 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 440 tests passed.
- Orders domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the new order/store bridge adapter, touched orders module, and focused adapter test returned no `any`, non-null assertions, or manual dependency field assignment boilerplate.
- Stale-reference scan confirmed `LegacyStoreServiceOrderStoreAvailabilityChecker`, `legacy-store-service-order-store-availability`, and order-module `StoreService` references are gone from order source/tests.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `OrdersModule` and mapped `/api/orders` routes.
- `pnpm smoke:api`
- Local route checks returned `POST /api/orders` invalid body `400`, `GET /api/store/status 200`, and scheduled `GET /api/store/status 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- The new order adapter is an adapter-only bridge from the order port to the store status use case; order domain/application code still depends only on `OrderStoreAvailabilityChecker`.
- Scheduled order behavior still explicitly ignores force-open mode through the store use-case command.
- `OrdersModule` no longer injects or imports `StoreService`; `StoreSettings` remains in the module entity list because `MikroOrmOrderStatusRepository` still reads it for delivered-order loyalty points.
- No route contracts or controller signatures changed, so Swagger DTO/controller rules were not affected.
- No code fixes were needed after self-review; focused tests, API/web typechecks, API build, full API unit tests, whitespace check, dependency scan, strictness scan, stale-reference scan, fresh boot, smoke, and route checks all passed.

Risks:
- This slice did not execute a successful live order to avoid mutating local order data; focused create-order tests and smoke invalid-order route checks cover store availability integration and route wiring.
- `StoreService` remains for store route compatibility and direct store adapter tests; removing it requires moving those remaining facade methods or proving no callers remain.
- `DeliveryAreasService.findById()` remains the next known delivery/order compatibility service surface.
- Next recommended slice is to re-read the guides and inspect `DeliveryAreasService.findById()` replacement with the existing order delivery-area port before changing order delivery fee behavior.

### 2026-05-07 - Phase 10 - DeliveryAreasService cleanup slice

Status: Done

Changed:
- Removed unused `DeliveryAreasService` provider/export from `DeliveryAreasModule`.
- Deleted `apps/api/src/modules/delivery-areas/delivery-areas.service.ts`.
- Preserved delivery public/admin routes through existing delivery read/write use cases and repositories.
- Preserved order delivery-fee behavior through `OrderDeliveryAreaRepository` and `MikroOrmOrderDeliveryAreaRepository.findActiveById()`.
- Kept delivery controllers, DTOs, delivery application/domain code, order delivery-fee logic, migrations, frontend files, deploy files, commits, pushes, and deployment out of scope.

Verified:
- Focused delivery/order checks: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/delivery/list-delivery-areas.use-case.test.ts test/contexts/delivery/create-delivery-area.use-case.test.ts test/contexts/delivery/update-delivery-area.use-case.test.ts test/contexts/delivery/delete-delivery-area.use-case.test.ts test/contexts/delivery/mikro-orm-delivery-area.read-repository.test.ts test/contexts/delivery/mikro-orm-delivery-area-write.repository.test.ts test/contexts/orders/order-delivery-fee.policy.test.ts test/contexts/orders/create-order.use-case.test.ts test/contexts/orders/mikro-orm-order-creation.repository.test.ts test/modules/delivery-areas/delivery-area.mapper.test.ts` - 30 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 440 tests passed.
- Delivery/orders domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the touched delivery module returned no `any`, non-null assertions, or manual dependency field assignment boilerplate.
- Stale-reference scan confirmed `DeliveryAreasService`, `delivery-areas.service`, `deliveryAreasService`, and legacy service `findById` refs are gone from source/tests.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `DeliveryAreasModule`, mapped `/api/delivery-areas` and `/api/admin/delivery-areas` routes, and mapped order routes.
- `pnpm smoke:api`
- Local route checks returned `GET /api/delivery-areas 200`, `POST /api/orders` invalid body `400`, and `GET /api/store/status 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- This was a module composition cleanup only; no controller, DTO, route contract, domain, application, mapper, or persistence behavior changed.
- Delivery public/admin routes already inject delivery use cases directly and do not depend on the deleted service.
- Order delivery-fee behavior already depends on `OrderDeliveryAreaRepository`, not the deleted service.
- `DeliveryAreasModule` still imports `Global` and is marked `@Global()`; this was left unchanged because removing it is unrelated to deleting the dead service and all checks passed with the existing module shape.
- No code fixes were needed after self-review; focused tests, API/web typechecks, API build, full API unit tests, whitespace check, dependency scan, strictness scan, stale-reference scan, fresh boot, smoke, and route checks all passed.

Risks:
- This cleanup did not execute a successful live delivery order to avoid mutating local order data; focused order delivery-fee and create-order tests cover behavior.
- `StoreService` remains for store route compatibility and direct store adapter tests.
- Remaining Phase 10 cleanup surfaces: inspect `OrdersService` provider/export, `StoreService` facade, `AuthService`/`AuthController`, and any other module services after a stale caller scan.
- Next recommended slice is to re-read the guides and inspect remaining service providers/callers with `rg`.

### 2026-05-07 - Phase 10 - OrdersService cleanup slice

Status: Done

Changed:
- Removed unused `OrdersService` provider/export from `OrdersModule`.
- Deleted `apps/api/src/modules/orders/orders.service.ts`.
- Preserved order create, kitchen list, order details, and status routes through existing order use cases and read/status/creation repositories.
- Kept order controllers, DTOs, order application/domain/adapters, payments, coupons, delivery areas, store behavior, auth behavior, migrations, frontend files, deploy files, commits, pushes, and deployment out of scope.

Verified:
- Focused order checks: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/orders/order-use-case-bridge.test.ts test/contexts/orders/create-order.use-case.test.ts test/contexts/orders/change-order-status.use-case.test.ts test/contexts/orders/mikro-orm-order-creation.repository.test.ts test/contexts/orders/get-store-status-use-case-order-store-availability.checker.test.ts` - 14 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 440 tests passed.
- Orders domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the touched orders module returned no `any`, non-null assertions, or manual dependency field assignment boilerplate.
- Stale-reference scan confirmed `OrdersService`, `orders.service`, and legacy service `findById` refs are gone from source/tests.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `OrdersModule` and mapped `/api/orders` create, kitchen, details, and status routes.
- `pnpm smoke:api`
- Local route checks returned `POST /api/orders` invalid body `400`, `GET /api/orders/00000000-0000-4000-8000-000000000000 404`, and `GET /api/store/status 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- This was a module composition cleanup only; no controller, DTO, route contract, domain, application, mapper, persistence, payment, coupon, delivery, store, or auth behavior changed.
- The deleted service method duplicated the existing order details lookup path that now lives behind `GetOrderDetailsUseCase` and `MikroOrmOrderReadRepository`.
- `OrdersModule` still exports the order use cases needed by other composition roots; it no longer exports a legacy Nest service.
- No code fixes were needed after self-review; focused tests, API/web typechecks, API build, full API unit tests, whitespace check, dependency scan, strictness scan, stale-reference scan, fresh boot, smoke, and route checks all passed.

Risks:
- This cleanup did not execute a successful live order to avoid mutating local order data; focused order use-case/repository tests and smoke invalid-order checks cover the affected wiring.
- `StoreService` remains for store route compatibility and direct store adapter tests.
- `AuthService`/`AuthController` still contain legacy admin login behavior and Swagger/OOP strictness gaps; moving auth requires a controller/DTO-aware slice.
- Next recommended slice is to re-read the guides and inspect `StoreService` callers/tests to decide whether to remove the facade or first move its remaining adapter tests onto store use cases.

### 2026-05-07 - Phase 10 - StoreService cleanup slice

Status: Done

Changed:
- Removed unused `StoreService` provider/export from `StoreModule`.
- Deleted `apps/api/src/modules/store/store.service.ts`.
- Deleted obsolete facade-only `apps/api/test/contexts/store/store-service-adapter.test.ts`.
- Preserved public store status behavior through `GetStoreStatusUseCase`, `StoreSchedule`, and `StoreAvailabilityPolicy`.
- Preserved admin store settings behavior through existing store settings/mode use cases.
- Preserved order store availability behavior through `GetStoreStatusUseCaseOrderStoreAvailabilityChecker`.
- Kept store/admin controllers, DTOs, store domain/application behavior, order/payment/coupon/auth logic, migrations, frontend files, deploy files, commits, pushes, and deployment out of scope.

Verified:
- Focused store/order checks: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/store/get-store-status.use-case.test.ts test/contexts/store/store-availability.policy.test.ts test/contexts/store/store-schedule.value-object.test.ts test/contexts/store/store-settings.use-case.test.ts test/contexts/orders/get-store-status-use-case-order-store-availability.checker.test.ts test/contexts/orders/create-order.use-case.test.ts` - 25 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 436 tests passed.
- Store domain/application dependency checks returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over the touched store module returned no `any`, non-null assertions, or manual dependency field assignment boilerplate.
- Stale-reference scan confirmed `StoreService`, `store.service`, `getEffectiveSchedule`, `getScheduleSummary`, and `store-service-adapter` refs are gone from source/tests.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `StoreModule`, mapped `/api/store/status`, and initialized `OrdersModule`.
- `pnpm smoke:api`
- Local route checks returned `GET /api/store/status 200`, scheduled `GET /api/store/status 200`, and `POST /api/orders` invalid body `400`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- This was a module composition cleanup plus removal of a facade-only test; no controller, DTO, route contract, domain, application, mapper, persistence, order, payment, coupon, or auth behavior changed.
- `StoreController` already uses `GetStoreStatusUseCase` directly, and admin store settings routes already use store settings/mode use cases directly.
- The deleted facade tests duplicated coverage that now lives in `get-store-status.use-case.test.ts`, `store-availability.policy.test.ts`, `store-schedule.value-object.test.ts`, `store-settings.use-case.test.ts`, and the order store-availability bridge test.
- The full API suite count dropped from 440 to 436 because the four deleted tests were only testing the removed facade.
- No code fixes were needed after self-review; focused tests, API/web typechecks, API build, full API unit tests, whitespace check, dependency scan, strictness scan, stale-reference scan, fresh boot, smoke, and route checks all passed.

Risks:
- This cleanup did not exercise authenticated admin store settings writes live to avoid mutating local store settings; focused store settings use-case tests and existing controller wiring checks cover behavior.
- `StoreModule` remains `@Global()` because it exports store repository/use cases used by other modules; removing global scope is a separate module-topology decision.
- `AuthService`/`AuthController` are now the remaining obvious legacy service surface; moving auth requires a controller/DTO-aware slice with Swagger rules and explicit response DTOs.
- Next recommended slice is to re-read the guides and inspect auth login/current-user behavior before deciding whether to migrate `AuthService.login` behind an admin auth use case or first tighten Auth DTO/response contracts.

### 2026-05-07 - Phase 10 - Admin auth use-case slice

Status: Done

Changed:
- Moved `POST /api/auth/login` off `AuthService.login()` and onto `LoginAdminUseCase`.
- Added admin auth ports: `AdminAuthRepository`, `AdminPasswordVerifier`, and `AdminTokenIssuer`.
- Added `MikroOrmAdminAuthRepository`, `BcryptAdminPasswordVerifier`, and `JwtAdminTokenIssuer` adapters.
- Added explicit Swagger-visible auth response DTOs: `LoginResponseDto`, `AuthUserResponseDto`, and `AuthProfileResponseDto`.
- Tightened `LoginDto` to explicit public readonly `declare` fields with JSDoc and no definite assignment assertions.
- Updated `AuthController` to use `LoginAdminUseCase`, return `Promise<LoginResponseDto>`, map `AdminInvalidCredentialsError` to `UnauthorizedException('Credenciais inválidas')`, and avoid `any` for `/api/auth/me` request typing.
- Updated `AuthModule` as the composition root for admin auth ports, adapters, and use case wiring.
- Deleted `apps/api/src/modules/auth/auth.service.ts`.
- Kept JWT strategy/guard behavior, customer auth, orders, payments, store, migrations, frontend files, deploy files, commits, pushes, and deployment out of scope.

Verified:
- Focused auth checks: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/admin/login-admin.use-case.test.ts test/contexts/admin/mikro-orm-admin-auth.repository.test.ts test/contexts/admin/bcrypt-admin-password.verifier.test.ts test/contexts/admin/jwt-admin-token.issuer.test.ts test/modules/auth/auth.controller.test.ts` - 10 tests passed.
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- Admin domain/application dependency scan returned no Nest, MikroORM, entity, controller, DTO, adapter, queue, socket, filesystem, or concrete PagBank imports.
- Strictness scan over touched/new auth/admin files and focused tests returned no `any`, non-null assertions, or manual dependency field assignment boilerplate.
- Swagger scan over the touched auth controller/DTO/request surface returned no `import type`, manual `@Api*`, `any`, `!:`, or `@IsIn`.
- Stale-reference scan confirmed `AuthService`, `auth.service`, `req: any`, `email!`, and `password!` are gone from source/tests.
- `rg --files apps/api/src/modules -g '*.service.ts'` returned no remaining module service files.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `AuthModule` and mapped `/api/auth/login` and `/api/auth/me`.
- `pnpm smoke:api`
- Local route checks returned invalid `POST /api/auth/login` `401` with `Credenciais inválidas`, unauthenticated `GET /api/auth/me` `401`, and `GET /api/store/status` `200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of stale local API watch processes.

Self-review:
- `LoginAdminUseCase` is a thin orchestrator: load admin auth account, verify password through a port, issue token through a port, and return a read model.
- Bcrypt, JWT, and MikroORM concerns live in adapters; the admin auth application layer has no framework or persistence imports.
- `AuthController` keeps the same route paths and invalid-credentials message while returning explicit DTO classes.
- `/api/auth/me` response shape remains `{ id, email }`, now via `AuthProfileResponseDto`; `any` was removed.
- The first self-review found duplicated imports from `@nestjs/jwt`; the auth module import was consolidated and focused tests, typechecks, build, scans, and the full API unit suite were rerun successfully.

Risks:
- This cleanup did not run a successful live admin login to avoid depending on local credentials/secrets; focused use-case/controller/adapter tests cover success, invalid credentials, token payload, and response shape, while live invalid-login/no-token checks cover route wiring.
- `JwtStrategy` and `JwtAuthGuard` behavior remains unchanged and still belongs to a later auth infrastructure quality cleanup if stricter legacy-code style is needed.
- Remaining Phase 10 surfaces: re-read the guides, run the final architecture/stale scans, update the phase checklist/status, and decide whether to add the dedicated `noImplicitOverride`/Biome quality enforcement slice now or defer it as tooling work.

### 2026-05-07 - Phase 10 - Architecture enforcement and closure

Status: Done

Changed:
- Added `scripts/check-api-architecture.mjs` for repo-local backend architecture checks.
- Added root scripts `pnpm check:api-architecture` and `pnpm check`.
- Enabled API `noImplicitOverride` in `apps/api/tsconfig.json`.
- Added missing `override` modifiers to `apps/api/src/migrations/Migration20260327110000.ts`.
- Marked Phases 6, 7, 8, 9, and 10 as `Done` in the phase overview.
- Marked the initial phase checklist complete.
- Updated the TypeScript/OOP strictness implementation notes to record the API `noImplicitOverride` and architecture-check script status.

Verified:
- `pnpm check:api-architecture`
- `pnpm check`
- `pnpm --filter api exec tsc --noEmit --pretty false --noImplicitOverride`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `pnpm --filter web exec tsc --noEmit --pretty false`
- `pnpm --filter api build`
- `git diff --check`
- `rg --files apps/api/src/modules -g '*.service.ts'` returned no remaining module service files.
- `rg -n "import type" apps/api/src/modules -g '*.controller.ts' -g '*.dto.ts'` returned no Swagger-visible controller/DTO type-only imports.
- Final stale-reference scans confirmed the legacy module service files and imports are gone.

Self-review:
- The architecture check enforces the dependency direction that was manually checked throughout the refactor: domain/application code cannot import Nest, MikroORM, entities, adapters, DTOs, controllers, queues, sockets, filesystem, or concrete PagBank modules.
- The check also keeps module service files from returning, blocks `.service` imports, and scans the new architecture/test surfaces for `any` and non-null assertions.
- API `noImplicitOverride` now runs as part of normal API typechecking.
- `pnpm check` intentionally keeps web typecheck in the verification loop without enabling web `noImplicitOverride`, because this is a backend refactor and the only web override issue is unrelated legacy UI code.

Risks:
- Biome is still deferred as a separate tooling rollout; adding it now would introduce a new dependency and broad style enforcement outside the backend architecture closure.
- Swagger/OpenAPI runtime generation is still not wired; DTO/controller changes made during the refactor followed `docs/SWAGGER.md`, and full Swagger setup remains a separate documentation/tooling slice if desired.
- No VPS/homologation deploy was performed because deployment was not requested.
- No commit was created; all passing slices are staged only.

### 2026-05-07 - Phase 11 - Store module topology slice

Status: Done

Changed:
- Documented the final `apps/api/src/modules/<bounded-context>` topology in `README.md`.
- Updated `apps/api/src/contexts/README.md` to mark `contexts/*` as temporary migration residue, not the target architecture.
- Updated the target architecture and added Phase 11 for module topology consolidation.
- Moved store domain, application, and persistence adapter files from `apps/api/src/contexts/store/**` into `apps/api/src/modules/store/{domain,application,adapters}/**`.
- Removed the now-empty `apps/api/src/contexts/store` placeholders.
- Updated store imports in StoreModule, StoreController, AdminController, OrdersModule, ProductsModule, SectionsModule, menu read repositories, the order/store adapter, and affected tests.
- Updated `scripts/check-api-architecture.mjs` so domain/application checks include `modules/<context>` and strictness scans correctly use repo-relative paths.

Verified:
- Focused store/order checks: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/store/get-store-status.use-case.test.ts test/contexts/store/store-availability.policy.test.ts test/contexts/store/store-schedule.value-object.test.ts test/contexts/store/store-settings.use-case.test.ts test/contexts/orders/get-store-status-use-case-order-store-availability.checker.test.ts` - 22 tests passed.
- `pnpm check:api-architecture`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- Stale source/test scan found no `contexts/store` imports outside historical documentation.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `StoreModule`, `ProductsModule`, `SectionsModule`, `OrdersModule`, and mapped `/api/store/status`, `/api/menu`, and `/api/menu/sections`.
- `pnpm smoke:api`
- Local route checks returned `GET /api/store/status 200`, `GET /api/menu 200`, and `GET /api/menu/sections 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of the local API watch session.

Self-review:
- This was a topology-only source move plus import rewiring; no controller method signatures, DTOs, route paths, database schema, order/payment behavior, or frontend code changed.
- Store domain/application code remains free of Nest, MikroORM entities, controllers, DTOs, queues, sockets, filesystem, and concrete PagBank imports.
- The store persistence adapter remains in an adapter folder and still owns MikroORM/entity access.
- The architecture checker now understands the target `modules/<context>` layout while still supporting remaining temporary `contexts/*` folders during migration.
- No code fixes were needed after self-review; focused tests, architecture check, API/web typechecks through `pnpm check`, API build, full API suite, whitespace check, stale-reference scan, fresh boot, smoke, and route checks passed.

Risks:
- Store tests still live under `apps/api/test/contexts/store`; moving test topology can happen later once the source consolidation pattern is repeated.
- Store HTTP controller still sits at `apps/api/src/modules/store/store.controller.ts`; moving HTTP adapters into `adapters/http` should be a separate Swagger-aware HTTP adapter slice.
- Remaining source contexts still live under `apps/api/src/contexts`; next recommended slice is to re-read the guides and move `menu` source files into `apps/api/src/modules/menu` because it now depends on the moved store module core.

### 2026-05-07 - Phase 11 - Menu module topology slice

Status: Done

Changed:
- Moved menu domain, application, HTTP placeholder, and persistence adapters from `apps/api/src/contexts/menu/**` into `apps/api/src/modules/menu/**`.
- Added `apps/api/src/modules/menu/menu.module.ts` as the menu composition root for public menu and public sections use cases.
- Reduced `ProductsModule` to the `/api/menu` HTTP controller plus `MenuModule` import.
- Reduced the public-section part of `SectionsModule` to the `/api/menu/sections` HTTP controller plus `MenuModule` import; admin section providers stayed in `SectionsModule`.
- Updated ProductsController and SectionsPublicController imports to the moved menu use cases without changing route paths, method signatures, or DTOs.
- Promoted `ProductPricePolicy` to `apps/api/src/shared/domain/product-price.policy.ts` because menu reads, coupon validation, and order creation all share the same pricing invariant.
- Updated `README.md`, `apps/api/src/shared/README.md`, and the architecture checker so shared backend domain is explicit and checked.
- Updated menu, order, coupon, and test imports that referenced the moved menu files.

Verified:
- Focused menu/store/order/coupon checks: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/menu/get-public-menu.use-case.test.ts test/contexts/menu/get-public-sections.use-case.test.ts test/contexts/menu/menu-availability.policy.test.ts test/contexts/menu/product-price.policy.test.ts test/contexts/store/get-store-status.use-case.test.ts test/contexts/store/store-availability.policy.test.ts test/contexts/store/store-schedule.value-object.test.ts test/contexts/store/store-settings.use-case.test.ts test/contexts/orders/create-order.use-case.test.ts test/contexts/coupons/validate-coupon.use-case.test.ts` - 43 tests passed.
- `pnpm check:api-architecture`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- Stale source/test scan found no `contexts/menu` imports outside historical documentation.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `MenuModule`, `ProductsModule`, `SectionsModule`, `StoreModule`, and mapped `/api/menu`, `/api/menu/featured`, `/api/menu/sections`, and `/api/store/status`.
- `pnpm smoke:api`
- Local route checks returned `GET /api/store/status 200`, `GET /api/menu 200`, `GET /api/menu/featured 200`, and `GET /api/menu/sections 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of the local API watch session.

Self-review:
- This slice moved menu source topology and provider composition only; no route paths, controller signatures, DTO shapes, database schema, payment behavior, order behavior, frontend code, deploy files, commits, pushes, or deployment changed.
- `MenuModule` owns menu read repositories and use-case wiring; `ProductsModule` and `SectionsModule` now only expose existing HTTP controllers around exported menu use cases.
- `ProductPricePolicy` is not duplicated; the shared backend domain location matches its actual consumers across menu, coupons, and orders.
- Menu domain/application code remains free of Nest, MikroORM entities, controllers, DTOs, queues, sockets, filesystem, and concrete PagBank imports.
- Swagger rules were re-read before touching controller files; controller changes were import-only and did not alter contracts.
- No further code fixes were needed after self-review; focused tests, architecture check, API/web typechecks through `pnpm check`, API build, full API suite, whitespace check, stale-reference scan, fresh boot, smoke, and route checks passed.

Risks:
- Menu tests still live under `apps/api/test/contexts/menu`; test topology can be normalized after source contexts are consolidated.
- Public menu HTTP controllers still sit in `modules/products` and `modules/sections`; moving controllers into `modules/menu/adapters/http` should be a separate Swagger-aware route-adapter slice.
- Remaining source contexts still live under `apps/api/src/contexts`; next recommended slice is to re-read the guides and move a smaller supporting context, likely `delivery`, into its owning module.

### 2026-05-07 - Phase 11 - Delivery module topology slice

Status: Done

Changed:
- Moved delivery domain, application, and persistence adapters from `apps/api/src/contexts/delivery/**` into `apps/api/src/modules/delivery-areas/{domain,application,adapters}/**`.
- Updated `DeliveryAreasModule`, `DeliveryAreasController`, and `delivery-area.mapper.ts` imports to use the module-local delivery-areas application/adapters paths.
- Updated affected delivery tests to import the moved delivery source from `apps/api/src/modules/delivery-areas`.
- Preserved public and admin delivery-area route paths, DTO shapes, controller method signatures, database schema, frontend files, deploy files, commits, pushes, and deployment.
- Updated the Phase 11 suggested order so `delivery` is marked complete under the target `modules/delivery-areas` topology.

Verified:
- Focused delivery/order checks: `pnpm --dir apps/api exec node --test -r ts-node/register test/contexts/delivery/create-delivery-area.use-case.test.ts test/contexts/delivery/delete-delivery-area.use-case.test.ts test/contexts/delivery/delivery-area-key.policy.test.ts test/contexts/delivery/list-delivery-areas.use-case.test.ts test/contexts/delivery/mikro-orm-delivery-area-write.repository.test.ts test/contexts/delivery/mikro-orm-delivery-area.read-repository.test.ts test/contexts/delivery/update-delivery-area.use-case.test.ts test/contexts/orders/order-delivery-fee.policy.test.ts test/modules/delivery-areas/delivery-area.mapper.test.ts` - 28 tests passed.
- `pnpm check:api-architecture`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- Stale source/test scan found no `contexts/delivery` imports.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `DeliveryAreasModule` and mapped `/api/delivery-areas` plus admin delivery-area routes.
- `pnpm smoke:api`
- Local route checks returned `GET /api/delivery-areas 200`, `GET /api/store/status 200`, and `GET /api/menu 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of the local API watch session.

Self-review:
- This was a topology-only source move plus import rewiring; no route paths, controller signatures, DTO shapes, database schema, payment behavior, order behavior, frontend code, deploy files, commits, pushes, or deployment changed.
- Delivery domain/application code remains free of Nest, MikroORM entities, controllers, DTOs, queues, sockets, filesystem, and concrete PagBank imports.
- Delivery persistence adapters remain in an adapter folder and still own MikroORM/entity access.
- Swagger rules were already loaded before the import-only controller touch; no request/response contract or manual Swagger decorator changed.
- No code fixes were needed after self-review; focused tests, architecture check, API/web typechecks through `pnpm check`, API build, full API suite, whitespace check, stale-reference scan, fresh boot, smoke, and route checks passed.

Risks:
- Delivery tests still live under `apps/api/test/contexts/delivery`; test topology can be normalized after source contexts are consolidated.
- Delivery HTTP controllers still sit at `apps/api/src/modules/delivery-areas/*.controller.ts`; moving HTTP adapters into `adapters/http` should be a separate Swagger-aware HTTP adapter slice.
- Remaining source contexts still live under `apps/api/src/contexts`; next recommended slice is to re-read the guides and move `coupons` into `apps/api/src/modules/coupons`.

### 2026-05-07 - Phase 11 - Coupons module topology slice

Status: Done

Changed:
- Moved coupon domain, application, and persistence adapters from `apps/api/src/contexts/coupons/**` into `apps/api/src/modules/coupons/{domain,application,adapters}/**`.
- Updated `CouponsModule`, `CouponsController`, and `coupon.mapper.ts` imports to use module-local coupon application/adapters paths.
- Updated `OrdersModule` and the order coupon-validator adapter to use the moved `ValidateCouponUseCase` from `apps/api/src/modules/coupons`.
- Updated affected coupon tests and the order coupon-validator test to import the moved coupon source from `apps/api/src/modules/coupons`.
- Preserved public/admin coupon route paths, DTO shapes, controller method signatures, database schema, order behavior, frontend files, deploy files, commits, pushes, and deployment.
- Updated the Phase 11 suggested order so `coupons` is marked complete under the target `modules/coupons` topology.

Verified:
- Focused coupon/order checks: `pnpm exec node --test -r ts-node/register test/contexts/coupons/coupon-applicability.policy.test.ts test/contexts/coupons/coupon-creation-draft.value-object.test.ts test/contexts/coupons/coupon-eligibility.policy.test.ts test/contexts/coupons/coupon-update-patch.value-object.test.ts test/contexts/coupons/create-admin-coupon.use-case.test.ts test/contexts/coupons/list-admin-coupons.use-case.test.ts test/contexts/coupons/mikro-orm-admin-coupon-write.repository.test.ts test/contexts/coupons/mikro-orm-admin-coupon.read-repository.test.ts test/contexts/coupons/mikro-orm-coupon-validation.read-repository.test.ts test/contexts/coupons/toggle-admin-coupon-active.use-case.test.ts test/contexts/coupons/update-admin-coupon.use-case.test.ts test/contexts/coupons/validate-coupon.use-case.test.ts test/contexts/orders/validate-coupon-use-case-order-coupon.validator.test.ts test/contexts/orders/create-order.use-case.test.ts test/modules/coupons/coupon.mapper.test.ts` from `apps/api` - 45 tests passed.
- `pnpm check:api-architecture`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- Stale source/test scan found no `contexts/coupons` imports and no old relative coupon-context imports.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `CouponsModule` and mapped `/api/coupons/validate` plus admin coupon routes.
- `pnpm smoke:api`
- Local route checks returned invalid `POST /api/coupons/validate` `400`, unauthenticated `GET /api/admin/coupons` `401`, `GET /api/store/status 200`, and `GET /api/menu 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of the local API watch session.

Self-review:
- This was a topology-only source move plus import rewiring; no route paths, controller signatures, DTO shapes, database schema, coupon behavior, order behavior, payment behavior, frontend code, deploy files, commits, pushes, or deployment changed.
- Coupon domain/application code remains free of Nest, MikroORM entities, controllers, DTOs, queues, sockets, filesystem, and concrete PagBank imports.
- Coupon persistence adapters remain in an adapter folder and still own MikroORM/entity access.
- Swagger rules were re-read before touching coupon controller imports; controller changes were import-only and did not alter contracts.
- The first verification pass found one stale relative import in `ValidateCouponUseCaseOrderCouponValidator` that did not spell `contexts/coupons`; it was fixed to point at `modules/coupons`, then focused tests, typecheck, architecture check, broad checks, full suite, fresh boot, smoke, and route checks were rerun successfully.

Risks:
- Coupon tests still live under `apps/api/test/contexts/coupons`; test topology can be normalized after source contexts are consolidated.
- Coupon HTTP controllers still sit at `apps/api/src/modules/coupons/coupons.controller.ts`; moving HTTP adapters into `adapters/http` should be a separate Swagger-aware HTTP adapter slice.
- `ValidateCouponUseCase` is now consumed from `modules/coupons` by the remaining temporary `contexts/orders` adapter while orders waits for its own topology slice.
- Remaining source contexts still live under `apps/api/src/contexts`; next recommended slice is to re-read the guides and move `customers` into `apps/api/src/modules/customers`.

### 2026-05-07 - Phase 11 - Customers module topology slice

Status: Done

Changed:
- Moved customer domain, application, and persistence adapters from `apps/api/src/contexts/customers/**` into `apps/api/src/modules/customers/{domain,application,adapters}/**`.
- Updated `CustomersModule`, `CustomersController`, `CustomerTokenGuard`, `authenticated-customer.request.ts`, and `customer.mapper.ts` imports to use module-local customer application/adapters paths.
- Updated `AdminController` and `admin-customer.mapper.ts` imports to use the moved customer application layer from `apps/api/src/modules/customers`.
- Updated affected customer, admin-mapper, customer-guard, and order tests to import the moved customer source from `apps/api/src/modules/customers`.
- Promoted `LoyaltyPointsPolicy` to `apps/api/src/shared/domain/loyalty-points.policy.ts` because customer loyalty flows and order creation/status flows share the same loyalty invariant.
- Updated `README.md`, `apps/api/src/shared/README.md`, and the target architecture notes so shared backend loyalty domain rules are explicit.
- Preserved customer/admin route paths, DTO shapes, controller method signatures, database schema, order behavior, frontend files, deploy files, commits, pushes, and deployment.
- Updated the Phase 11 suggested order so `customers` is marked complete under the target `modules/customers` topology.

Verified:
- Focused customer/admin/order checks: `pnpm exec node --test -r ts-node/register $(rg --files test/contexts/customers -g '*.test.ts') test/modules/customers/customer.mapper.test.ts test/modules/customers/customer-token.guard.test.ts test/modules/admin/admin-customer.mapper.test.ts test/contexts/orders/change-order-status.use-case.test.ts test/contexts/orders/create-order.use-case.test.ts` from `apps/api` - 92 tests passed.
- Post-review shared-loyalty checks: `pnpm exec node --test -r ts-node/register test/contexts/customers/loyalty-points.policy.test.ts test/contexts/customers/adjust-customer-loyalty.use-case.test.ts test/contexts/customers/get-customer-redeemable-products.use-case.test.ts test/contexts/orders/change-order-status.use-case.test.ts test/contexts/orders/create-order.use-case.test.ts` from `apps/api` - 19 tests passed.
- `pnpm check:api-architecture`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- Stale source/test scan found no `contexts/customers` imports, no old relative customer-context imports, and no `modules/customers/domain/loyalty-points.policy` imports.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `CustomersModule` and mapped public customer routes, authenticated customer routes, admin customers, and admin loyalty adjustment.
- `pnpm smoke:api`
- Local route checks returned invalid `POST /api/customers/identify` `400`, unauthenticated `GET /api/customers/me` `401`, unauthenticated `GET /api/admin/customers` `401`, `GET /api/store/status 200`, and `GET /api/menu 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of the local API watch session.

Self-review:
- This was a topology source move plus import rewiring; no route paths, controller signatures, DTO shapes, database schema, customer behavior, order behavior, payment behavior, frontend code, deploy files, commits, pushes, or deployment changed.
- Customer domain/application code remains free of Nest, MikroORM entities, controllers, DTOs, queues, sockets, filesystem, and concrete PagBank imports.
- Customer persistence adapters remain in an adapter folder and still own MikroORM/entity access.
- Swagger rules were re-read before touching customer/admin controller and request-surface imports; controller changes were import-only and did not alter contracts.
- The first architecture-check pass found that `contexts/orders` application use cases could not import `modules/customers/domain/LoyaltyPointsPolicy`. The policy was promoted to shared backend domain, documentation was updated, and affected focused tests, architecture check, typecheck, broad checks, full suite, fresh boot, smoke, and route checks were rerun successfully.

Risks:
- Customer tests still live under `apps/api/test/contexts/customers`; test topology can be normalized after source contexts are consolidated.
- Customer HTTP controller and auth guard still sit at `apps/api/src/modules/customers/*.ts`; moving HTTP adapters into `adapters/http` should be a separate Swagger-aware HTTP adapter slice.
- `LoyaltyPointsPolicy` is now shared backend domain. Keep it limited to the loyalty invariant shared by customer and order flows; do not turn shared domain into a generic bucket.
- Remaining source contexts still live under `apps/api/src/contexts`; next recommended slice is to re-read the guides and move a sensitive context, likely `payments`, with focused payment/webhook verification before moving orders.

### 2026-05-07 - Phase 11 - Payments module topology slice

Status: Done

Changed:
- Moved payment domain, application, and adapters from `apps/api/src/contexts/payments/**` into `apps/api/src/modules/payments/{domain,application,adapters}/**`.
- Updated `PaymentsModule`, `PaymentsController`, `WebhookController`, and `PaymentProcessor` imports to use module-local payment paths.
- Updated affected payment tests and `tests/pagbank/pagbank-webhook.spec.ts` to import the moved payment source from `apps/api/src/modules/payments`.
- Preserved payment route paths, DTO shapes, controller method signatures, gateway behavior, queue behavior, database schema, order behavior, frontend files, deploy files, commits, pushes, and deployment.
- Updated the Phase 11 suggested order so `payments` is marked complete under the target `modules/payments` topology.

Verified:
- Focused payment checks: `pnpm exec node --test -r ts-node/register test/contexts/payments/*.test.ts` from `apps/api` - 50 tests passed.
- `pnpm check:api-architecture`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `git diff --check`
- `pnpm check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- PagBank webhook Playwright check: `NEXT_PUBLIC_API_URL=http://localhost:3334 pnpm test:e2e tests/pagbank/pagbank-webhook.spec.ts` - 6 tests passed.
- Stale source/test scan found no `contexts/payments` imports outside historical documentation.
- Payment domain/application dependency scan found no Nest, MikroORM, entity, adapter, controller, DTO, queue, socket, filesystem, or concrete PagBank dependency-rule violations.
- Payment strictness scan found no casual `any` or non-null assertions in moved payment source/tests/spec.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `PaymentsModule` and mapped Pix, credit-card, 3DS, debit-card, payment-status, and PagBank webhook routes.
- `pnpm smoke:api`
- Local route checks returned invalid `POST /api/payments/pix` `400`, unsigned `POST /api/webhooks/pagbank` `403`, `GET /api/store/status 200`, and `GET /api/menu 200`; the smoke script's no-op PagBank webhook check returned `200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of the local API watch session.

Self-review:
- This was a topology-only source move plus import rewiring; no route paths, controller signatures, DTO shapes, payment gateway behavior, queue behavior, webhook mapping behavior, database schema, order behavior, frontend code, deploy files, commits, pushes, or deployment changed.
- Payment domain/application code remains free of Nest, MikroORM entities, controllers, DTOs, queues, sockets, filesystem, and concrete PagBank imports.
- Payment adapters remain in adapter folders and still own Nest logging, ConfigService access, MikroORM/entity access, BullMQ, Socket.IO, and PagBank integration details.
- Swagger rules were re-read before touching payment controller imports; controller changes were import-only and did not alter request/response contracts.
- No code fixes were needed after self-review; focused payment tests, architecture check, API/web typechecks through `pnpm check`, API build, full API suite, PagBank webhook Playwright check, stale-reference scan, strictness scan, fresh boot, smoke, and route checks passed.

Risks:
- Payment tests still live under `apps/api/test/contexts/payments`; test topology can be normalized after source contexts are consolidated.
- Payment HTTP controllers and processor still sit at `apps/api/src/modules/payments/*.ts`; moving HTTP/queue adapters into `adapters/http` and `adapters/queue` should be a separate Swagger-aware adapter topology slice.
- Remaining source contexts still live under `apps/api/src/contexts`, especially `orders` and `admin`; next recommended slice is to re-read the guides and move `orders` with focused order/payment/coupon/customer verification before moving admin.

### 2026-05-07 - Phase 11 - Orders module topology slice

Status: Done

Changed:
- Moved order domain, application, and adapters from `apps/api/src/contexts/orders/**` into `apps/api/src/modules/orders/{domain,application,adapters}/**`.
- Updated `OrdersModule` and `OrdersController` imports to use module-local order application/adapters paths.
- Updated affected order tests to import the moved order source from `apps/api/src/modules/orders`.
- Preserved order route paths, DTO shapes, controller method signatures, creation/status behavior, transaction boundaries, database schema, payment behavior, frontend files, deploy files, commits, pushes, and deployment.
- Updated the Phase 11 suggested order so `orders` is marked complete under the target `modules/orders` topology.

Verified:
- Focused order checks: `pnpm exec node --test -r ts-node/register test/contexts/orders/*.test.ts` from `apps/api` - 57 tests passed.
- `pnpm check:api-architecture`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `git diff --check`
- Order domain/application dependency scan found no Nest, MikroORM, entity, adapter, controller, DTO, queue, socket, filesystem, or concrete PagBank dependency-rule violations.
- Order strictness scan found no casual `any` or non-null assertions in moved order source/tests.
- `pnpm check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- Stale source/test scan found no `contexts/orders` imports outside historical documentation.
- `zsh -ic 'killport 3334'`
- Fresh API boot through `API_PORT=3334 pnpm --filter api dev`; boot initialized `OrdersModule` and mapped create-order, kitchen-orders, order-details, and order-status routes.
- `pnpm smoke:api`
- Local route checks returned invalid `POST /api/orders` `400`, unauthenticated `GET /api/orders/kitchen` `401`, missing `GET /api/orders/00000000-0000-0000-0000-000000000000` `404`, `GET /api/store/status 200`, and `GET /api/menu 200`.
- `zsh -ic 'killport 3334'` after smoke checks, followed by cleanup of the local API watch session.

Self-review:
- This was a topology-only source move plus import rewiring; no route paths, controller signatures, DTO shapes, order creation behavior, status transition behavior, transaction boundaries, payment behavior, database schema, frontend code, deploy files, commits, pushes, or deployment changed.
- Order domain/application code remains free of Nest, MikroORM entities, controllers, DTOs, queues, sockets, filesystem, and concrete PagBank imports.
- Order adapters remain in adapter folders and still own Nest logging, MikroORM/entity access, Socket.IO, and bridge calls to store/coupon application use cases.
- Swagger rules were re-read before touching order controller imports; controller changes were import-only and did not alter request/response contracts.
- No code fixes were needed after self-review; focused order tests, architecture check, API/web typechecks through `pnpm check`, API build, full API suite, stale-reference scan, strictness scan, fresh boot, smoke, and route checks passed.

Risks:
- Order tests still live under `apps/api/test/contexts/orders`; test topology can be normalized after source contexts are consolidated.
- Order HTTP controller still sits at `apps/api/src/modules/orders/orders.controller.ts`; moving HTTP adapters into `adapters/http` should be a separate Swagger-aware adapter topology slice.
- Remaining source context files now live under `apps/api/src/contexts/admin`; next recommended slice is to re-read the guides and move `admin`, then remove the temporary `contexts` root if it becomes empty.

### 2026-05-07 - Phase 11 - Admin module topology slice

Status: Done

Changed:
- Moved admin domain, application, auth adapters, and persistence adapters from `apps/api/src/contexts/admin/**` into `apps/api/src/modules/admin/{domain,application,adapters}/**`.
- Updated `AdminModule`, `AdminController`, admin mappers, `AuthModule`, `AuthController`, `SectionsModule`, `SectionsAdminController`, and `section.mapper.ts` imports to use module-local or sibling `modules/admin` paths.
- Updated affected admin, auth, and sections tests to import the moved admin source from `apps/api/src/modules/admin`.
- Removed obsolete `.gitkeep` files from nonempty admin `adapters` and `application` directories after self-review.
- Removed the obsolete temporary `apps/api/src/contexts/README.md` and removed the empty `apps/api/src/contexts` source root.
- Preserved admin/auth/sections route paths, DTO shapes, controller method signatures, auth behavior, admin mutation behavior, database schema, frontend files, deploy files, commits, pushes, and deployment.
- Marked Phase 11 complete because no source files remain under `apps/api/src/contexts` and each moved bounded context now has a single source home under `apps/api/src/modules/<context>`.

Verified:
- Focused admin/auth/sections checks: `pnpm exec node --test -r ts-node/register $(rg --files test/contexts/admin -g '*.test.ts') test/modules/admin/*.test.ts test/modules/auth/auth.controller.test.ts test/modules/sections/section.mapper.test.ts` from `apps/api` - 159 tests passed.
- `pnpm check:api-architecture`
- `pnpm --filter api exec tsc --noEmit --pretty false`
- `git diff --check`
- Admin domain/application dependency scan found no Nest, MikroORM, entity, adapter, controller, DTO, queue, socket, filesystem, or concrete PagBank dependency-rule violations.
- Admin/auth/sections strictness scan found no casual `any` or non-null assertions in moved/touched source and focused tests.
- Swagger controller/DTO scan found no `import type` in touched admin/auth/sections controller or DTO files.
- Source-context stale scan found no `apps/api/src/contexts` files and no source/test imports referencing `src/contexts/admin`.
- `pnpm check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`; boot initialized `AdminModule`, `AuthModule`, `SectionsModule`, and all other API modules, then mapped admin/auth/sections/public routes on `http://localhost:3334`.
- `pnpm smoke:api`
- Local route checks returned unauthenticated `GET /api/admin/dashboard 401`, unauthenticated `GET /api/admin/categories 401`, unauthenticated `GET /api/admin/sections 401`, invalid `POST /api/auth/login 400`, `GET /api/store/status 200`, and `GET /api/menu 200`.
- Post-review cleanup reran `git diff --check`, `pnpm check:api-architecture`, source-context residue scan, and admin `.gitkeep` scan successfully.

Self-review:
- This was a topology-only source move plus import rewiring; no route paths, controller signatures, DTO shapes, admin/auth behavior, section behavior, database schema, frontend code, deploy files, commits, pushes, or deployment changed.
- Admin domain/application code remains free of Nest, MikroORM entities, controllers, DTOs, queues, sockets, filesystem, and concrete PagBank imports.
- Admin auth and persistence adapters remain in adapter folders and still own bcrypt, JWT, MikroORM, and entity access.
- Swagger rules were re-read before touching admin/auth/sections controller imports; controller changes were import-only and did not alter request/response contracts.
- The first self-review found obsolete `.gitkeep` files in nonempty moved admin directories; those files were removed and lightweight guardrails were rerun.
- The reviewed passing slice is staged after verification, but not committed.

Risks:
- Admin tests still live under `apps/api/test/contexts/admin`; test topology can be normalized after source contexts are consolidated.
- Admin/Auth/Sections HTTP controllers still sit at module roots; moving HTTP adapters into `adapters/http` should be a separate Swagger-aware adapter topology slice.
- The architecture checker still contains compatibility paths for `apps/api/test/contexts/**` because tests intentionally kept their current topology in this source-focused slice.

### 2026-05-07 - Post-Phase - DTO request/response organization

Status: Done

Changed:
- Updated this refactor guide and `docs/SWAGGER.md` to require `dto/request`, `dto/response`, and narrowly scoped `dto/shared` folders instead of flat `dto/*.dto.ts` files.
- Moved request body/query DTO files under `dto/request` for admin, auth, coupons, customers, orders, and payments.
- Moved response DTO files under `dto/response` for admin, auth, coupons, customers, delivery areas, and sections.
- Moved the shared nested admin weekly schedule contract to `apps/api/src/modules/admin/dto/shared/weekly-schedule.dto.ts` because category request and response DTOs both use it.
- Updated controller, mapper, and focused test imports to the new DTO paths.
- Preserved DTO class names, fields, decorators, route paths, controller signatures, domain/application logic, database schema, frontend files, deploy files, commits, pushes, and deployment.

Verified:
- `pnpm --filter api exec tsc --noEmit --pretty false`
- Focused controller/mapper DTO checks: `pnpm exec node --test -r ts-node/register test/modules/admin/*.test.ts test/modules/auth/auth.controller.test.ts test/modules/coupons/coupon.mapper.test.ts test/modules/customers/customer.mapper.test.ts test/modules/delivery-areas/delivery-area.mapper.test.ts test/modules/sections/section.mapper.test.ts` from `apps/api` - 35 tests passed.
- `pnpm check:api-architecture`
- `pnpm check`
- `pnpm --filter api build`
- Full API unit suite: `pnpm exec node --test --test-concurrency=1 -r ts-node/register $(rg --files test -g '*.test.ts')` from `apps/api` - 446 tests passed.
- Flat DTO scan found no `*.dto.ts` files directly under any module `dto/` folder.
- DTO cross-import scan found no response DTO importing `dto/request` and no request DTO importing `dto/response`.
- Stale import scan found no `./dto/*.dto` or `/dto/*.dto` imports that bypass `request`, `response`, or `shared`.
- Swagger controller/DTO scan found no `import type` in controller or DTO files.
- `zsh -ic 'killport 3334'`, `zsh -ic 'killport 3848'`, and `zsh -ic 'killport 3001'`
- Fresh API boot through `pnpm --filter api dev`; boot mapped admin, auth, customer, delivery, order, payment, coupon, menu, store, and section routes on `http://localhost:3334`.
- `pnpm smoke:api`
- Local route checks returned invalid `POST /api/auth/login 400`, invalid `POST /api/customers/identify 400`, unauthenticated `GET /api/admin/categories 401`, `GET /api/store/status 200`, and `GET /api/menu 200`.

Self-review:
- This was a DTO folder organization slice only; no DTO runtime fields, validation decorators, response mapper behavior, route paths, or controller signatures changed.
- The remaining `dto/shared` folder is intentionally limited to a nested contract class reused by both request and response DTOs. It is not a generic types bucket.
- The moved DTOs remain adapter contracts and do not leak into domain or application code.
- No code fixes were needed after self-review; focused tests, architecture check, repo check, API build, full suite, stale scans, fresh boot, smoke, and route checks passed.

Risks:
- Swagger generation is still not wired into the Nest build; this slice organizes DTO files for that later Swagger setup but does not add the Swagger plugin or docs endpoint.
- Some controllers still live at module roots instead of `adapters/http`; moving those should remain a separate Swagger-aware HTTP adapter topology slice.
