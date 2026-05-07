# Backend Hexagonal Architecture Refactor Plan

Status: Draft
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
  contexts/
    store/
      domain/
      application/
        ports/
        use-cases/
      adapters/
        http/
        persistence/
    menu/
      domain/
      application/
        ports/
        read-models/
        use-cases/
      adapters/
        http/
        persistence/
    orders/
      domain/
      application/
        ports/
        use-cases/
      adapters/
        http/
        persistence/
        realtime/
    payments/
      domain/
      application/
        ports/
        use-cases/
      adapters/
        http/
        pagbank/
        queue/
    customers/
      domain/
      application/
      adapters/
    delivery/
      domain/
      application/
      adapters/
    coupons/
      domain/
      application/
      adapters/
    admin/
      application/
      adapters/
  shared/
    application/
      clock/
      unit-of-work/
    infrastructure/
      mikro-orm/
```

This is a target. The migration should be incremental and should not break existing public routes.

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

Status: In progress

Changed:
- ...

Verified:
- ...

Risks:
- ...
```

## Quality Gate Between Steps

The refactor must behave like many small high-quality tasks, not one rushed rewrite. Codex must not start the next phase or sub-phase until the current slice passes this gate.

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
- `git diff --check` passes.
- The plan has been updated with changed files, verification, remaining risk, and next recommended slice.
- The diff is reviewable: no unrelated formatting churn, no opportunistic rewrites, no hidden behavior changes.

Stop conditions:

- Typecheck or relevant tests fail.
- The implementation needs a migration or data backfill that was not planned.
- The slice touches payment/order/schedule behavior in a way not covered by tests.
- The code starts duplicating business rules across old and new paths without a clear temporary bridge.
- A performance-sensitive endpoint risks extra queries and no baseline exists.

When a stop condition happens, Codex should document the blocker here, explain the safest smaller next step, and stop instead of continuing deeper into the refactor.

## Phase 0 - Baseline And Safety Net

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Status: Not started

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

Best practice for a multi-hour refactor:

1. Keep this plan file as the source of truth.
2. Ask Codex to work one phase or sub-phase at a time.
3. Require Codex to state the exact write scope before editing.
4. Require Codex to update this file after each phase or sub-phase.
5. Require the Quality Gate Between Steps before continuing.
6. Keep commits small and semantic, but only when Yan asks for commits.
7. Do not let a 5-hour run mix architecture, visual changes, payment changes, and deployment without checkpoints.
8. Run tests/typechecks at each boundary.
9. Ask for a status update if the run is long.
10. Avoid interactive git operations.
11. Do not deploy until the current slice is coherent and deployment is requested.
12. If context compacts, tell Codex to read this file first and continue from the latest status block.

Best prompt shape:

```text
Read docs/backend-hexagonal-refactor-plan.md.
Work only on Phase N / sub-phase X.
Before editing, state the exact write scope.
Implement the smallest coherent slice.
Run the relevant checks from the Quality Gate.
Update the plan with what changed, verification, risk, and next recommended slice.
Do not start the next phase. Do not commit, push, or deploy unless I ask.
```

Suggested prompt to continue work:

```text
Read docs/backend-hexagonal-refactor-plan.md. Continue the next unchecked phase only.
Keep routes stable. Update the plan as you go. Run typechecks. Stop after the quality gate. Do not deploy and do not commit unless I ask.
```

Suggested prompt for a long autonomous run:

```text
Read docs/backend-hexagonal-refactor-plan.md and execute phases incrementally.
After each phase or sub-phase: update the doc, run verification, create a concise status report, and continue only if the Quality Gate passes.
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

- Ask for one slice.
- Let Codex finish and stop.
- Review the diff or ask Codex for a review-style summary.
- Ask for the next slice only after the current one is understood.

Use long autonomous runs only for low-risk mechanical phases. For orders, payments, schedules, migrations, and cache behavior, prefer shorter reviewable slices.

## Codex Operating Loop

For this project, Codex should use this loop:

1. Read latest plan status.
2. Inspect current files for the selected phase.
3. Identify exact write scope.
4. Make minimal structural changes.
5. Run targeted verification.
6. Update this plan.
7. Stop for review or continue to the next small slice if explicitly requested.

If a task touches payments, order creation, migrations, or deploy, Codex should slow down and create an explicit checkpoint before proceeding.

## Initial Phase Checklist

- [ ] Phase 0 - Baseline And Safety Net
- [ ] Phase 1 - Architecture Skeleton
- [ ] Phase 2 - Extract Pure Domain Policies
- [ ] Phase 3 - Introduce Application Use Cases Around Existing Services
- [ ] Phase 4 - Store Context
- [ ] Phase 5 - Menu Read Models
- [ ] Phase 6 - Orders Write Model
- [ ] Phase 7 - Payments Context
- [ ] Phase 8 - Admin Context And Mutations
- [ ] Phase 9 - Customers, Loyalty, Delivery, Coupons
- [ ] Phase 10 - Remove Legacy Services And Clean Modules

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

No implementation work has started under this plan yet.
